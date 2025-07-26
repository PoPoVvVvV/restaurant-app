import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true }, // ex: 'kg', 'L', 'pièce'
  stock: { type: Number, default: 0 },
});

const Ingredient = mongoose.model('Ingredient', IngredientSchema);
export default Ingredient;