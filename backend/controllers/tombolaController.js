import mongoose from 'mongoose';
import TombolaTicket from '../models/TombolaTicket.js';
import webhookService from '../services/webhookService.js';

// Créer un nouveau ticket de tombola
export const createTombolaTicket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { firstName, lastName, phone, ticketNumber, price } = req.body;
    const userId = req.user?._id;

    // Validation des entrées
    if (!firstName || !lastName || !phone || !ticketNumber || price === undefined) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
    }

    // Vérifier si le numéro de ticket existe déjà
    const existingTicket = await TombolaTicket.findOne({ ticketNumber }).session(session);
    if (existingTicket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Ce numéro de ticket existe déjà' });
    }

    // Créer le ticket
    const ticket = new TombolaTicket({
      ticketNumber,
      firstName,
      lastName,
      phone,
      price,
      user: userId
    });

    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ 
      success: true, 
      message: 'Ticket créé avec succès',
      ticket
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Erreur lors de la création du ticket:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création du ticket',
      error: error.message 
    });
  }
};

// Récupérer tous les tickets (pour les administrateurs)
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await TombolaTicket.find({}).sort({ purchaseDate: -1 });
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des tickets',
      error: error.message 
    });
  }
};

// Réinitialiser tous les tickets (pour les administrateurs)
export const resetAllTickets = async (req, res) => {
  console.log('Début de la réinitialisation des tickets...');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier si l'utilisateur est administrateur
    if (!req.user || req.user.role !== 'admin') {
      console.log('Accès refusé - Rôle insuffisant:', req.user?.role);
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.' 
      });
    }

    console.log('Suppression de tous les tickets existants...');
    
    // Option 1: Supprimer tous les tickets (décommenter si c'est le comportement souhaité)
    // const result = await TombolaTicket.deleteMany({}).session(session);
    
    // Option 2: Réinitialiser le statut des tickets existants (au lieu de les supprimer)
    const result = await TombolaTicket.updateMany(
      {},
      { $set: { isWinner: false, prize: null } },
      { session, multi: true }
    );
    
    console.log('Résultat de la réinitialisation:', result);
    
    await session.commitTransaction();
    session.endSession();

    const message = result.matchedCount > 0 
      ? `${result.matchedCount} tickets ont été réinitialisés avec succès.`
      : 'Aucun ticket à réinitialiser.';
    
    console.log(message);
    
    res.status(200).json({ 
      success: true, 
      message,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Erreur lors de la réinitialisation des tickets:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la réinitialisation des tickets',
      error: error.message 
    });
  }
};

// Tirage au sort des gagnants (pour les administrateurs)
export const drawWinners = async (req, res) => {
  console.log('Début du tirage au sort - Utilisateur:', {
    userId: req.user?._id,
    role: req.user?.role
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier si l'utilisateur est administrateur
    if (!req.user || req.user.role !== 'admin') {
      console.error('Accès refusé - Rôle insuffisant:', req.user?.role);
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.' 
      });
    }

    // Récupérer tous les tickets non gagnants
    const tickets = await TombolaTicket.find({ isWinner: false })
      .populate({
        path: 'user',
        select: '_id',
        options: { lean: true }
      })
      .session(session);
    
    console.log(`Tickets non gagnants trouvés: ${tickets.length}`);

    if (tickets.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun ticket éligible trouvé pour le tirage.' 
      });
    }

    // Grouper les tickets par utilisateur
    const ticketsByUser = new Map();
    
    tickets.forEach(ticket => {
      if (!ticket.user) {
        console.warn('Ticket sans utilisateur associé:', ticket._id);
        return;
      }
      
      const userId = ticket.user._id.toString();
      if (!ticketsByUser.has(userId)) {
        ticketsByUser.set(userId, []);
      }
      ticketsByUser.get(userId).push(ticket);
    });

    console.log(`Nombre d'utilisateurs uniques: ${ticketsByUser.size}`);

    if (ticketsByUser.size === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun participant valide trouvé pour le tirage.' 
      });
    }

    // Déterminer le nombre de prix à attribuer (max 3)
    const numberOfPrizes = Math.min(ticketsByUser.size, 3);
    console.log(`Nombre de prix à attribuer: ${numberOfPrizes}`);

    // Sélectionner les gagnants
    const winners = [];
    const prizeTypes = ['first', 'second', 'third'];
    const userIds = Array.from(ticketsByUser.keys());
    
    // Mélanger les utilisateurs
    for (let i = userIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [userIds[i], userIds[j]] = [userIds[j], userIds[i]];
    }

    // Sélectionner les gagnants
    for (let i = 0; i < numberOfPrizes; i++) {
      const userId = userIds[i];
      const userTickets = ticketsByUser.get(userId);
      // Prendre le premier ticket de l'utilisateur
      const winningTicket = userTickets[0];
      
      winners.push({
        ticket: winningTicket,
        prize: prizeTypes[i]
      });

      console.log(`${prizeTypes[i].toUpperCase()} Prix:`, {
        ticketId: winningTicket._id,
        userId: winningTicket.user?._id,
        name: `${winningTicket.firstName} ${winningTicket.lastName}`
      });
    }

    // Mettre à jour les tickets gagnants dans la base de données
    for (const winner of winners) {
      await TombolaTicket.findByIdAndUpdate(
        winner.ticket._id,
        { 
          isWinner: true,
          prize: winner.prize
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Récupérer les informations complètes des gagnants
    const winnersInfo = await TombolaTicket.find({
      _id: { $in: winners.map(w => w.ticket._id) }
    }).populate('user', 'firstName lastName phone');

    // Formater la réponse
    const result = {
      success: true,
      message: `Tirage effectué avec succès pour ${winners.length} gagnant(s)`,
      winners: {
        first: winnersInfo.find(w => w.prize === 'first'),
        second: winnersInfo.find(w => w.prize === 'second'),
        third: winnersInfo.find(w => w.prize === 'third')
      }
    };

    console.log('Résultat du tirage:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Erreur lors du tirage au sort:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue lors du tirage au sort',
      error: error.message 
    });
  }
};

// Récupérer les gagnants
export const getWinners = async (req, res) => {
  try {
    const winners = await TombolaTicket.find({ isWinner: true });
    res.status(200).json({ 
      success: true, 
      winners: {
        first: winners.find(w => w.prize === 'first'),
        second: winners.find(w => w.prize === 'second'),
        third: winners.find(w => w.prize === 'third')
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des gagnants:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des gagnants',
      error: error.message 
    });
  }
};
