import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Ingredient from '../models/Ingredient.js';

const router = express.Router();

// Obtenir tous les ingrédients
router.get('/', protect, async (req, res) => {
  const ingredients = await Ingredient.find();
  res.json(ingredients);
});

// Ajouter un ingrédient (Admin)
router.post('/', [protect, admin], async (req, res) => {
  const { name, unit, stock } = req.body;
  const newIngredient = new Ingredient({ name, unit, stock });
  await newIngredient.save();
  res.status(201).json(newIngredient);
});

// Mettre à jour le stock d'un ingrédient
router.put('/:id/stock', protect, async (req, res) => {
  const ingredient = await Ingredient.findById(req.params.id);
  ingredient.stock = req.body.stock;
  await ingredient.save();
  res.json(ingredient);
});

export default router;