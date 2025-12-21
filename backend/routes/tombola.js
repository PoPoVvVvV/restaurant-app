import express from 'express';
import { 
  createTombolaTicket, 
  getAllTickets, 
  resetAllTickets, 
  drawWinners, 
  getWinners 
} from '../controllers/tombolaController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Créer un nouveau ticket (accessible à tous les utilisateurs authentifiés)
router.post('/', auth, createTombolaTicket);

// Récupérer tous les tickets (uniquement pour les administrateurs)
router.get('/', auth, getAllTickets);

// Réinitialiser tous les tickets (uniquement pour les administrateurs)
router.post('/reset-tickets', auth, resetAllTickets);

// Effectuer un tirage au sort (uniquement pour les administrateurs)
router.post('/draw', auth, drawWinners);

// Récupérer les gagnants (accessible à tous)
router.get('/winners', getWinners);

export default router;
