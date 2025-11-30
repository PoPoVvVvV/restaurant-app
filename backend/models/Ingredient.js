import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true }, // ex: 'kg', 'L', 'pièce'
  stock: { type: Number, default: 0 },
});

// Indexes pour optimiser les requêtes fréquentes
IngredientSchema.index({ name: 1 }); // Déjà unique, mais index explicite
IngredientSchema.index({ stock: 1 });

const Ingredient = mongoose.model('Ingredient', IngredientSchema);
export default Ingredient;