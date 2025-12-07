import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import { createTransaction, getTransactions } from '../controllers/christmasTransactionController.js';

const router = express.Router();

// Créer une nouvelle transaction (accessible aux utilisateurs connectés)
router.post('/', protect, createTransaction);

// Obtenir toutes les transactions (admin uniquement)
router.get('/', [protect, admin], getTransactions);

export default router;
