import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import Product from '../../models/Product.js';
import webhookService from '../../services/webhookService.js';
import { cacheMiddleware, invalidateCache } from '../../services/cache.js';
import mongoose from 'mongoose';

const router = express.Router();
const CACHE_KEY_ALL_PRODUCTS = 'all_products';
const CACHE_TTL = 300; // 5 minutes

// Optimisation: Utiliser lean() pour les requêtes en lecture seule
const getProductsQuery = () => Product.find().lean().sort({ category: 1, name: 1 });

// @route   POST /api/products
// @desc    Créer un nouveau produit
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, category, price, corporatePrice, cost, stock } = req.body;
    const newProduct = new Product({ name, category, price, corporatePrice, cost, stock });
    await newProduct.save({ session });
    await session.commitTransaction();
    
    // Invalider le cache après la création
    invalidateCache(CACHE_KEY_ALL_PRODUCTS);
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });
    
    res.status(201).json(newProduct);
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/products
// @desc    Obtenir tous les produits
// @access  Privé (Employés & Admins)
router.get('/', protect, cacheMiddleware(CACHE_KEY_ALL_PRODUCTS, CACHE_TTL), async (req, res) => {
  try {
    const products = await getProductsQuery();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PUT /api/products/:id
// @desc    Mettre à jour un produit
// @access  Privé/Admin
router.put('/:id', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, session }
    );
    
    if (!updatedProduct) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    await session.commitTransaction();
    invalidateCache(CACHE_KEY_ALL_PRODUCTS);
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });

    res.json(updatedProduct);
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  } finally {
    session.endSession();
  }
});

// @route   DELETE /api/products/:id
// @desc    Supprimer un produit
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(req.params.id).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    await product.deleteOne({ session });
    await session.commitTransaction();

    invalidateCache(CACHE_KEY_ALL_PRODUCTS);
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });

    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  } finally {
    session.endSession();
  }
});

// @route   PUT /api/products/restock/:id
// @desc    Réapprovisionner un produit (changer son stock)
// @access  Privé (Employés & Admins)
router.put('/restock/:id', protect, async (req, res) => {
  const { newStock } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const stockValue = parseInt(newStock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'La valeur du stock est invalide.' });
    }

    const product = await Product.findById(req.params.id).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    const oldStock = product.stock;
    product.stock = stockValue;
    await product.save({ session });
    await session.commitTransaction();

    if (oldStock !== stockValue) {
      await webhookService.notifyProductStockUpdate(product, oldStock, stockValue, req.user);
    }

    invalidateCache(CACHE_KEY_ALL_PRODUCTS);
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });

    res.json(product);
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  } finally {
    session.endSession();
  }
});

export default router;