import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Recipe from '../models/Recipe.js';

const router = express.Router();

// @route   GET /api/recipes
// @desc    Obtenir toutes les recettes
// @access  Privé
router.get('/', protect, async (req, res) => {
  try {
    const recipes = await Recipe.find({}).populate('productId', 'name category');
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/recipes
// @desc    Créer ou mettre à jour une recette
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  const { productId, ingredients } = req.body;
  try {
    const recipeData = {
      productId,
      ingredients,
      createdBy: req.user.id
    };

    let recipe = await Recipe.findOneAndUpdate(
      { productId: productId },
      recipeData,
      { new: true, upsert: true } // Crée la recette si elle n'existe pas, sinon la met à jour
    );
    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;