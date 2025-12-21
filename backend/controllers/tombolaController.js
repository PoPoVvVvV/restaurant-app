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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier si l'utilisateur est administrateur
    if (req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.' 
      });
    }

    // Supprimer tous les tickets
    const result = await TombolaTicket.deleteMany({}).session(session);
    
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ 
      success: true, 
      message: `Tous les tickets (${result.deletedCount}) ont été réinitialisés avec succès.`,
      deletedCount: result.deletedCount
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier si l'utilisateur est administrateur
    if (req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.' 
      });
    }

    // Vérifier s'il y a déjà des gagnants
    const existingWinners = await TombolaTicket.find({ isWinner: true }).session(session);
    if (existingWinners.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Un tirage au sort a déjà eu lieu. Veuillez réinitialiser les gagnants avant de procéder à un nouveau tirage.' 
      });
    }

    // Récupérer tous les tickets non gagnants avec les utilisateurs peuplés
    const tickets = await TombolaTicket.find({ isWinner: false })
      .populate({
        path: 'user',
        select: '_id',
        options: { lean: true }
      })
      .session(session);
    
    console.log('Tickets trouvés:', tickets.length);
    console.log('Premier ticket:', {
      id: tickets[0]?._id,
      user: tickets[0]?.user,
      firstName: tickets[0]?.firstName,
      lastName: tickets[0]?.lastName
    });
    
    // Grouper les tickets par utilisateur
    const ticketsByUser = new Map();
    console.log('Tickets récupérés:', tickets.length);
    
    tickets.forEach((ticket, index) => {
      console.log(`Ticket ${index + 1}:`, {
        ticketId: ticket._id,
        userId: ticket.user?._id?.toString(),
        userName: ticket.firstName + ' ' + ticket.lastName
      });
      
      if (ticket.user && ticket.user._id) {
        const userId = ticket.user._id.toString();
        if (!ticketsByUser.has(userId)) {
          ticketsByUser.set(userId, []);
          console.log('Nouvel utilisateur détecté:', userId);
        } else {
          console.log('Utilisateur existant:', userId);
        }
        ticketsByUser.get(userId).push(ticket);
      } else {
        console.warn('Ticket sans utilisateur valide:', ticket._id);
      }
    });
    
    console.log('Nombre d\'utilisateurs uniques trouvés:', ticketsByUser.size);
    console.log('Utilisateurs uniques:', Array.from(ticketsByUser.keys()));
    
    // Vérifier s'il y a assez de participants uniques
    if (ticketsByUser.size < 3) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Pas assez de participants uniques pour effectuer un tirage. Il doit y avoir au moins 3 participants différents.' 
      });
    }
    
    // Sélectionner un ticket par utilisateur de manière aléatoire
    const uniqueTickets = [];
    ticketsByUser.forEach(userTickets => {
      const randomIndex = Math.floor(Math.random() * userTickets.length);
      uniqueTickets.push(userTickets[randomIndex]);
    });
    
    // Mélanger les tickets uniques
    const shuffledTickets = [...uniqueTickets].sort(() => 0.5 - Math.random());
    
    if (shuffledTickets.length < 3) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Erreur lors de la préparation du tirage. Veuillez réessayer.' 
      });
    }
    
    // Sélectionner les gagnants
    const firstPrize = shuffledTickets[0]._id;
    const secondPrize = shuffledTickets[1]._id;
    const thirdPrize = shuffledTickets[2]._id;

    // Mettre à jour les gagnants
    await TombolaTicket.updateOne(
      { _id: firstPrize },
      { $set: { isWinner: true, prize: 'first' } },
      { session }
    );

    await TombolaTicket.updateOne(
      { _id: secondPrize },
      { $set: { isWinner: true, prize: 'second' } },
      { session }
    );

    await TombolaTicket.updateOne(
      { _id: thirdPrize },
      { $set: { isWinner: true, prize: 'third' } },
      { session }
    );

    // Récupérer les informations des gagnants
    const winners = await TombolaTicket.find({
      _id: { $in: [firstPrize, secondPrize, thirdPrize] }
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    // Envoyer une notification aux gagnants (à implémenter si nécessaire)
    // await notifyWinners(winners);

    res.status(200).json({ 
      success: true, 
      message: 'Tirage au sort effectué avec succès',
      winners: {
        first: winners.find(w => w.prize === 'first'),
        second: winners.find(w => w.prize === 'second'),
        third: winners.find(w => w.prize === 'third')
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Erreur lors du tirage au sort:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du tirage au sort',
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
