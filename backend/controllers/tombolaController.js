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
  console.log('Début du tirage au sort - Utilisateur:', {
    userId: req.user?._id,
    role: req.user?.role,
    isAdmin: req.user?.role === 'admin'
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
    
    // Vérifier s'il y a des participants
    if (ticketsByUser.size === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun participant trouvé pour effectuer un tirage.'
      });
    }
    
    // Déterminer le nombre de prix à attribuer (maximum 3, ou moins s'il y a moins de participants)
    const numberOfPrizes = Math.min(ticketsByUser.size, 3);
    console.log(`Tirage de ${numberOfPrizes} prix parmi ${ticketsByUser.size} participants uniques`);
    
    // Sélectionner un ticket par utilisateur de manière aléatoire
    const uniqueTickets = [];
    ticketsByUser.forEach(userTickets => {
      const randomIndex = Math.floor(Math.random() * userTickets.length);
      uniqueTickets.push(userTickets[randomIndex]);
    });
    
    // Mélanger les tickets uniques
    const shuffledTickets = [...uniqueTickets].sort(() => 0.5 - Math.random());
    
    if (shuffledTickets.length < numberOfPrizes) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: `Erreur: ${shuffledTickets.length} tickets uniques disponibles pour ${numberOfPrizes} prix.` 
      });
    }
    
    // Sélectionner les gagnants en fonction du nombre de prix
    const winners = [];
    const prizeTypes = ['first', 'second', 'third'];
    
    for (let i = 0; i < numberOfPrizes; i++) {
      const winner = {
        ticket: shuffledTickets[i],
        prize: prizeTypes[i]
      };
      winners.push(winner);
      
      console.log(`${prizeTypes[i].toUpperCase()} Prix:`, {
        ticketId: winner.ticket._id,
        userId: winner.ticket.user?._id,
        name: `${winner.ticket.firstName} ${winner.ticket.lastName}`
      });
    }

    // Mettre à jour les gagnants dans la base de données
    const winnerIds = [];
    for (let i = 0; i < winners.length; i++) {
      await TombolaTicket.updateOne(
        { _id: winners[i].ticket._id },
        { $set: { isWinner: true, prize: winners[i].prize } },
        { session }
      );
      winnerIds.push(winners[i].ticket._id);
    }

    // Récupérer les informations complètes des gagnants
    const winnersInfo = await TombolaTicket.find({
      _id: { $in: winnerIds }
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    // Envoyer une notification aux gagnants (à implémenter si nécessaire)
    // await notifyWinners(winners);

    // Préparer la réponse avec les gagnants
    const response = { success: true, message: 'Tirage au sort effectué avec succès', winners: {} };
    
    // Ajouter chaque gagnant à la réponse
    winnersInfo.forEach(winner => {
      if (winner.prize === 'first') response.winners.first = winner;
      else if (winner.prize === 'second') response.winners.second = winner;
      else if (winner.prize === 'third') response.winners.third = winner;
    });
    
    console.log('Réponse du tirage:', JSON.stringify(response, null, 2));
    res.status(200).json(response);

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
