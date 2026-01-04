import express from 'express';
import mongoose from 'mongoose';
import { protect, admin } from '../middleware/auth.js';
import ExpenseNote from '../models/ExpenseNote.js';
import Expense from '../models/Expense.js';
import Setting from '../models/Setting.js';

const router = express.Router();

// @route   POST /api/expense-notes
// @desc    Créer une nouvelle note de frais
// @access  Privé (Employé/Admin)
router.post('/', protect, async (req, res) => {
  try {
    const { firstName, lastName, date, imageUrl, amount } = req.body;

    // Validation
    if (!firstName || !lastName || !date || !imageUrl || !amount) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Le montant doit être un nombre positif.' });
    }

    const expenseNote = new ExpenseNote({
      employeeId: req.user.id,
      firstName,
      lastName,
      date: new Date(date),
      imageUrl,
      amount: parsedAmount,
      status: 'pending',
    });

    await expenseNote.save();

    req.io.emit('data-updated', { type: 'EXPENSE_NOTES_UPDATED' });

    res.status(201).json({ message: 'Note de frais créée avec succès.', expenseNote });
  } catch (error) {
    console.error('Erreur lors de la création de la note de frais:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/expense-notes/me
// @desc    Obtenir toutes les notes de frais de l'employé connecté
// @access  Privé (Employé/Admin)
router.get('/me', protect, async (req, res) => {
  try {
    const expenseNotes = await ExpenseNote.find({ employeeId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'username')
      .lean();

    res.json(expenseNotes);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes de frais:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/expense-notes
// @desc    Obtenir toutes les notes de frais (Admin uniquement)
// @access  Privé/Admin
router.get('/', [protect, admin], async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const expenseNotes = await ExpenseNote.find(query)
      .sort({ createdAt: -1 })
      .populate('employeeId', 'username')
      .populate('reviewedBy', 'username')
      .lean();

    res.json(expenseNotes);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes de frais:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PUT /api/expense-notes/:id/approve
// @desc    Approuver une note de frais (Admin uniquement)
// @access  Privé/Admin
router.put('/:id/approve', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expenseNote = await ExpenseNote.findById(req.params.id).session(session);
    
    if (!expenseNote) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Note de frais non trouvée.' });
    }

    if (expenseNote.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cette note de frais a déjà été traitée.' });
    }

    // Mettre à jour le statut de la note de frais
    expenseNote.status = 'approved';
    expenseNote.reviewedBy = req.user.id;
    expenseNote.reviewedAt = new Date();
    await expenseNote.save({ session });

    // Récupérer la semaine en cours
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' }).session(session);
    const currentWeekId = weekSetting?.value || 1;

    // Créer une dépense de type "frais véhicule"
    const expense = new Expense({
      weekId: currentWeekId,
      amount: expenseNote.amount,
      category: 'frais véhicule',
      description: `Note de frais - ${expenseNote.firstName} ${expenseNote.lastName}`,
      date: expenseNote.date,
      addedBy: req.user.id,
    });
    await expense.save({ session });

    await session.commitTransaction();

    req.io.emit('data-updated', { type: 'EXPENSE_NOTES_UPDATED' });
    req.io.emit('data-updated', { type: 'EXPENSES_UPDATED' });

    res.json({ 
      message: 'Note de frais approuvée et ajoutée aux dépenses.', 
      expenseNote,
      expense 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Erreur lors de l\'approbation de la note de frais:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  } finally {
    session.endSession();
  }
});

// @route   PUT /api/expense-notes/:id/reject
// @desc    Rejeter une note de frais (Admin uniquement)
// @access  Privé/Admin
router.put('/:id/reject', [protect, admin], async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const expenseNote = await ExpenseNote.findById(req.params.id);
    
    if (!expenseNote) {
      return res.status(404).json({ message: 'Note de frais non trouvée.' });
    }

    if (expenseNote.status !== 'pending') {
      return res.status(400).json({ message: 'Cette note de frais a déjà été traitée.' });
    }

    expenseNote.status = 'rejected';
    expenseNote.reviewedBy = req.user.id;
    expenseNote.reviewedAt = new Date();
    expenseNote.rejectionReason = rejectionReason || 'Non spécifié';

    await expenseNote.save();

    req.io.emit('data-updated', { type: 'EXPENSE_NOTES_UPDATED' });

    res.json({ message: 'Note de frais rejetée.', expenseNote });
  } catch (error) {
    console.error('Erreur lors du rejet de la note de frais:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   DELETE /api/expense-notes/:id
// @desc    Supprimer une note de frais (seulement si pending)
// @access  Privé (Employé peut supprimer ses propres notes en attente)
router.delete('/:id', protect, async (req, res) => {
  try {
    const expenseNote = await ExpenseNote.findById(req.params.id);
    
    if (!expenseNote) {
      return res.status(404).json({ message: 'Note de frais non trouvée.' });
    }

    // Vérifier que l'utilisateur est le propriétaire ou un admin
    if (expenseNote.employeeId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Vous n\'avez pas la permission de supprimer cette note de frais.' });
    }

    // Seules les notes en attente peuvent être supprimées
    if (expenseNote.status !== 'pending') {
      return res.status(400).json({ message: 'Seules les notes de frais en attente peuvent être supprimées.' });
    }

    await expenseNote.deleteOne();

    req.io.emit('data-updated', { type: 'EXPENSE_NOTES_UPDATED' });

    res.json({ message: 'Note de frais supprimée.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la note de frais:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;

