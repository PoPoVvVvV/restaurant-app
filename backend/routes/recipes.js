import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Recipe from '../models/Recipe.js';
import Ingredient from '../models/Ingredient.js';

const router = express.Router();

// @route   GET /api/recipes
// @desc    Obtenir toutes les recettes
// @access  Privé
router.get('/', protect, async (req, res) => {
  try {
    const recipes = await Recipe.find({}).populate('productId', 'name category');
    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/recipes
// @desc    Créer ou mettre à jour une recette et synchroniser les ingrédients
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  const { productId, ingredients } = req.body;

  try {
    for (const ing of ingredients) {
      if (ing.name) {
        await Ingredient.findOneAndUpdate(
          { name: ing.name },
          { $setOnInsert: { name: ing.name, unit: 'g/mL' } },
          { upsert: true, new: true }
        );
      }
    }

    const recipeData = {
      productId,
      ingredients,
      createdBy: req.user.id
    };
    const recipe = await Recipe.findOneAndUpdate(
      { productId: productId },
      recipeData,
      { new: true, upsert: true }
    );
    
    req.io.emit('data-updated', { type: 'INGREDIENTS_UPDATED' });
    res.status(201).json(recipe);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;