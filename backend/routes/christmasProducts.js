import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import ChristmasProduct from '../models/ChristmasProduct.js';

const router = express.Router();

// @route   POST /api/christmas-products
// @desc    Créer un nouveau produit du Marché de Noël
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  try {
    const { name, category, price, cost, stock, description } = req.body;
    
    const newProduct = new ChristmasProduct({ 
      name, 
      category, 
      price, 
      cost, 
      stock: stock || 0,
      description: description || ''
    });
    
    const product = await newProduct.save();
    
    // Notifier tous les clients que les produits ont changé
    req.io.emit('data-updated', { type: 'CHRISTMAS_PRODUCTS_UPDATED' });
    
    res.status(201).json(product);
  } catch (err) {
    console.error('Erreur lors de la création du produit de Noël:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la création du produit',
      error: err.message 
    });
  }
});

// @route   GET /api/christmas-products
// @desc    Obtenir tous les produits du Marché de Noël
// @access  Public
router.get('/', async (req, res) => {
  try {
    const products = await ChristmasProduct.find().sort({ category: 1, name: 1 });
    res.json(products);
  } catch (err) {
    console.error('Erreur lors de la récupération des produits de Noël:', err);
    res.status(500).json({ 
      message: 'Erreur du serveur',
      error: err.message 
    });
  }
});

// @route   GET /api/christmas-products/:id
// @desc    Obtenir un produit spécifique du Marché de Noël
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await ChristmasProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (err) {
    console.error('Erreur lors de la récupération du produit de Noël:', err);
    res.status(500).json({ 
      message: 'Erreur du serveur',
      error: err.message 
    });
  }
});

// @route   PUT /api/christmas-products/:id
// @desc    Mettre à jour un produit du Marché de Noël
// @access  Privé/Admin
router.put('/:id', [protect, admin], async (req, res) => {
  try {
    const { name, category, price, cost, stock, description } = req.body;
    
    const updatedProduct = await ChristmasProduct.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        category, 
        price, 
        cost, 
        stock,
        description
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    // Notifier tous les clients que les produits ont changé
    req.io.emit('data-updated', { type: 'CHRISTMAS_PRODUCTS_UPDATED' });
    
    res.json(updatedProduct);
  } catch (err) {
    console.error('Erreur lors de la mise à jour du produit de Noël:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du produit',
      error: err.message 
    });
  }
});

// @route   DELETE /api/christmas-products/:id
// @desc    Supprimer un produit du Marché de Noël
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const product = await ChristmasProduct.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    // Notifier tous les clients que les produits ont changé
    req.io.emit('data-updated', { type: 'CHRISTMAS_PRODUCTS_UPDATED' });
    
    res.json({ message: 'Produit supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression du produit de Noël:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du produit',
      error: err.message 
    });
  }
});

export default router;
