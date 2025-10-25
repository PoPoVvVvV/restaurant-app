import express from 'express';
import Setting from '../models/Setting.js';
import Expense from '../models/Expense.js';
import User from '../models/User.js';
import { protect, admin } from '../middleware/auth.js';

// Message de vérification
console.log("--- ✅ CHARGEMENT DU FICHIER expenses.js VERSION CORRIGÉE ---");

const router = express.Router();

// @route   POST /api/expenses
router.post('/', [protect, admin], async (req, res) => {
  try {
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
    const currentWeekId = weekSetting?.value || 1;
    const { amount, category, description, date } = req.body;

    if (!amount || !category) {
        return res.status(400).json({ message: 'Le montant et la catégorie sont obligatoires.' });
    }

    const newExpense = new Expense({
      weekId: currentWeekId,
      amount: parseFloat(amount),
      category,
      description,
      date: date || Date.now(),
      addedBy: req.user.id
    });

    const expense = await newExpense.save();
    
    // Mettre à jour lastActive
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });
    
    res.status(201).json(expense);
  } catch (error) {
    console.error("ERREUR DANS POST /api/expenses:", error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/expenses
router.get('/', [protect, admin], async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
        weekIdToFetch = parseInt(req.query.week, 10);
    } else {
        const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
        weekIdToFetch = weekSetting?.value || 1;
    }
    
    const expenses = await Expense.find({ weekId: weekIdToFetch }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   DELETE /api/expenses/:id
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }
    await expense.deleteOne();
    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;