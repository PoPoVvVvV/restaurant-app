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
    const { name, unit, stock, lowStockThreshold } = req.body;
    const newIngredient = new Ingredient({ name, unit, stock, lowStockThreshold });
    await newIngredient.save();
    
    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.status(201).json(newIngredient);
  } catch (err) {
    res.status(400).json({ message: 'Erreur lors de la création de l\'ingrédient.' });
  }
});

// @route   PUT /api/ingredients/:id
// @desc    Mettre à jour des paramètres d'un ingrédient (ex: seuil stock bas)
// @access  Privé/Admin
router.put('/:id', [protect, admin], async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingrédient non trouvé.' });
    }

    if (req.body.lowStockThreshold !== undefined) {
      const threshold = Number(req.body.lowStockThreshold);
      if (Number.isNaN(threshold) || threshold < 0) {
        return res.status(400).json({ message: 'Le seuil de stock bas est invalide.' });
      }
      ingredient.lowStockThreshold = threshold;
    }

    await ingredient.save();
    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.json(ingredient);
  } catch (err) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour de l\'ingrédient.' });
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
    const parsedStock = Number(req.body.stock);
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: 'La valeur du stock est invalide.' });
    }
    const lowStockThreshold = (typeof ingredient.lowStockThreshold === 'number')
      ? ingredient.lowStockThreshold
      : 500;
    ingredient.stock = parsedStock;
    await ingredient.save();

    // Répondre immédiatement sans attendre le webhook
    res.json(ingredient);

    // Envoyer notification webhook de manière asynchrone (ne bloque pas la réponse)
    if (oldStock !== parsedStock) {
      webhookService.notifyIngredientStockUpdate(ingredient, oldStock, parsedStock, req.user).catch(err => {
        console.error("Erreur webhook ingrédient:", err.message);
      });

      // Alerte "stock bas" uniquement lors du passage au-dessous du seuil
      if (oldStock > lowStockThreshold && parsedStock <= lowStockThreshold) {
        webhookService.notifyLowStock('ingredient', ingredient.name, parsedStock, lowStockThreshold, req.user).catch(err => {
          console.error("Erreur webhook stock bas ingrédient:", err.message);
        });
      }
    }

    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
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

export default router;