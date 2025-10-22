import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Ingredient from '../models/Ingredient.js';
import Recipe from '../models/Recipe.js';
import webhookService from '../services/webhookService.js';

const router = express.Router();

// @route   GET /api/ingredients
// @desc    Obtenir tous les ingrédients
// @access  Privé
router.get('/', protect, async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/ingredients
// @desc    Ajouter un nouvel ingrédient (Admin)
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  try {
    const { name, unit, stock } = req.body;
    const newIngredient = new Ingredient({ name, unit, stock });
    await newIngredient.save();
    
    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.status(201).json(newIngredient);
  } catch (err) {
    res.status(400).json({ message: 'Erreur lors de la création de l\'ingrédient.' });
  }
});

// @route   PUT /api/ingredients/:id/stock
// @desc    Mettre à jour le stock d'un ingrédient
// @access  Privé
router.put('/:id/stock', protect, async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingrédient non trouvé.' });
    }
    
    // Sauvegarder l'ancien stock pour la notification
    const oldStock = ingredient.stock;
    ingredient.stock = req.body.stock;
    await ingredient.save();

    // Envoyer notification webhook si le stock a changé
    if (oldStock !== req.body.stock) {
      await webhookService.notifyIngredientStockUpdate(ingredient, oldStock, req.body.stock, req.user);
    }

    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.json(ingredient);
  } catch (err) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour du stock.' });
  }
});

// @route   DELETE /api/ingredients/:id
// @desc    Supprimer une matière première
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingrédient non trouvé' });
    }
    await ingredient.deleteOne();
    
    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.json({ message: 'Ingrédient supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/ingredients/sync-from-recipes
// @desc    Synchroniser les ingrédients depuis toutes les recettes
// @access  Privé/Admin
router.post('/sync-from-recipes', [protect, admin], async (req, res) => {
  try {
    const allRecipes = await Recipe.find({});
    const allIngredients = new Map();

    allRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        if (ing.name && !allIngredients.has(ing.name)) {
          allIngredients.set(ing.name, { name: ing.name, unit: 'g/mL' });
        }
      });
    });

    const ingredientOps = Array.from(allIngredients.values()).map(ing => ({
      updateOne: {
        filter: { name: ing.name },
        update: { $setOnInsert: ing },
        upsert: true
      }
    }));

    if (ingredientOps.length > 0) {
      await Ingredient.bulkWrite(ingredientOps);
    }
    
    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.json({ message: `${ingredientOps.length} ingrédients synchronisés.` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/ingredients/stocks/bulk-update
// @desc    Mettre à jour en lot plusieurs stocks d'ingrédients (inventaire ou correction massive)
// @access  Privé/Admin
router.post('/stocks/bulk-update', protect, async (req, res) => {
  try {
    const updates = req.body.stocks; // [{ _id, stock }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Aucune modification à traiter.' });
    }
    const ids = updates.map(u => u._id);
    const existing = await Ingredient.find({ _id: { $in: ids } });
    const existingMap = Object.fromEntries(existing.map(e => [e._id.toString(), e]));
    // Pour la notification groupée :
    const notificationChanges = [];
    for (const up of updates) {
      const doc = existingMap[up._id];
      if (!doc) continue;
      const oldStock = doc.stock;
      if (oldStock !== up.stock) {
        notificationChanges.push({
          type: 'ingredient',
          itemName: doc.name,
          oldStock,
          newStock: up.stock,
          user: req.user.username || req.user.email || 'Utilisateur inconnu',
          timestamp: new Date().toISOString()
        });
        doc.stock = up.stock;
        await doc.save();
      }
    }
    if (notificationChanges.length > 0) {
      await webhookService.sendGroupedStockUpdateNotification(notificationChanges);
    }
    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.json({ message: `${notificationChanges.length} stocks modifiés.`, changes: notificationChanges });
  } catch (err) {
    console.error('Erreur bulk update ingrédients :', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour groupée.' });
  }
});

export default router;