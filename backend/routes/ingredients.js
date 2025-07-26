import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Ingredient from '../models/Ingredient.js';
import Recipe from '../models/Recipe.js';

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
    ingredient.stock = req.body.stock;
    await ingredient.save();

    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.json(ingredient);
  } catch (err) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour du stock.' });
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