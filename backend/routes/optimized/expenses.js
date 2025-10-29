import mongoose from 'mongoose';
import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import Expense from '../../models/Expense.js';
import Setting from '../../models/Setting.js';
import { cacheMiddleware, invalidateCache } from '../../services/cache.js';

const router = express.Router();
const CACHE_KEY_CURRENT_WEEK_EXPENSES = 'current_week_expenses';
const CACHE_TTL = 300; // 5 minutes

// @route   POST /api/expenses
// @desc    Créer une dépense
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [weekSetting] = await Promise.all([
      Setting.findOne({ key: 'currentWeekId' }).session(session).lean()
    ]);

    const currentWeekId = weekSetting?.value || 1;
    const expense = new Expense({
      ...req.body,
      weekId: currentWeekId,
      createdBy: req.user.id
    });

    await expense.save({ session });
    await session.commitTransaction();

    invalidateCache(CACHE_KEY_CURRENT_WEEK_EXPENSES);
    req.io.emit('data-updated', { type: 'EXPENSES_UPDATED' });

    // Notification Discord asynchrone
    const webhookUrl = process.env.DISCORD_EXPENSES_WEBHOOK_URL;
    if (webhookUrl) {
      const embed = {
        title: `Nouvelle dépense: ${expense.amount.toFixed(2)}$`,
        description: expense.description,
        color: 15158332,
        fields: [
          { name: "Catégorie", value: expense.category },
          { name: "Ajoutée par", value: req.user.username }
        ],
        timestamp: new Date().toISOString()
      };

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      }).catch(err => console.error("Erreur Webhook Dépenses:", err.message));
    }

    res.status(201).json(expense);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/expenses
// @desc    Obtenir toutes les dépenses d'une semaine
// @access  Privé/Admin
router.get('/', [protect, admin], cacheMiddleware(CACHE_KEY_CURRENT_WEEK_EXPENSES, CACHE_TTL), async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
      weekIdToFetch = parseInt(req.query.week, 10);
    } else {
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' }).lean();
      weekIdToFetch = weekSetting?.value || 1;
    }

    const expenses = await Expense.find({ weekId: weekIdToFetch })
      .populate('createdBy', 'username')
      .lean()
      .sort({ createdAt: -1 });

    const totalByCategory = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    res.json({
      expenses,
      totalByCategory,
      total: expenses.reduce((sum, exp) => sum + exp.amount, 0)
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Supprimer une dépense
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expense = await Expense.findById(req.params.id).session(session);
    if (!expense) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    await expense.deleteOne({ session });
    await session.commitTransaction();
    
    invalidateCache(CACHE_KEY_CURRENT_WEEK_EXPENSES);
    req.io.emit('data-updated', { type: 'EXPENSES_UPDATED' });
    
    res.json({ message: 'Dépense supprimée' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Erreur du serveur' });
  } finally {
    session.endSession();
  }
});

// @route   PUT /api/expenses/:id
// @desc    Modifier une dépense
// @access  Privé/Admin
router.put('/:id', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expense = await Expense.findById(req.params.id).session(session);
    if (!expense) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    const { amount, description, category } = req.body;
    expense.amount = amount || expense.amount;
    expense.description = description || expense.description;
    expense.category = category || expense.category;

    await expense.save({ session });
    await session.commitTransaction();
    
    invalidateCache(CACHE_KEY_CURRENT_WEEK_EXPENSES);
    req.io.emit('data-updated', { type: 'EXPENSES_UPDATED' });

    res.json(expense);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

export default router;