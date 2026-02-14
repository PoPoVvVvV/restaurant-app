import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true }, // ex: 'kg', 'L', 'pièce'
  stock: { type: Number, default: 0 },
  // Seuil "stock bas" configurable par ingrédient (ex: g/mL)
  lowStockThreshold: { type: Number, default: 500, min: 0 },
  // Stock "cible" (permanent) à conserver en inventaire
  permanentStock: { type: Number, default: 0, min: 0 },
  // Fournisseur utilisé pour la prévision de commande (page admin)
  supplierName: { type: String, default: '', trim: true },
  // Prix unitaire (par unité de stock) chez le fournisseur
  supplierUnitPrice: { type: Number, default: 0, min: 0 },
});

// Indexes pour optimiser les requêtes fréquentes
IngredientSchema.index({ name: 1 }); // Déjà unique, mais index explicite
IngredientSchema.index({ stock: 1 });

const Ingredient = mongoose.model('Ingredient', IngredientSchema);
export default Ingredient;