import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity50: { type: String, required: true }, // Quantité pour 50 portions (ex: "10kg", "5L")
  quantity100: { type: String, required: true }, // Quantité pour 100 portions
});

const RecipeSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true, // Une seule recette par produit
  },
  ingredients: [IngredientSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
});

// Indexes pour optimiser les requêtes fréquentes
RecipeSchema.index({ productId: 1 }); // Déjà unique, mais index explicite
RecipeSchema.index({ createdBy: 1 });

const Recipe = mongoose.model('Recipe', RecipeSchema);
export default Recipe;