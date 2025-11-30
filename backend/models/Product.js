import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du produit est obligatoire'],
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Menus', 'Plats', 'Boissons', 'Desserts', 'Partenariat'],
  },
  price: {
    type: Number,
    required: [true, 'Le prix de vente est obligatoire'],
    default: 0,
  },
  corporatePrice: {
    type: Number,
  },
  cost: {
    type: Number,
    required: [true, 'Le coût unitaire est obligatoire'],
    default: 0,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes pour optimiser les requêtes fréquentes
ProductSchema.index({ category: 1, name: 1 });
ProductSchema.index({ stock: 1 });
ProductSchema.index({ createdAt: -1 });

const Product = mongoose.model('Product', ProductSchema);

export default Product;