import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Product from '../models/Product.js';
import webhookService from '../services/webhookService.js';

const router = express.Router();

// @route   POST /api/products
// @desc    Créer un nouveau produit
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  try {
    const { name, category, price, corporatePrice, cost, stock } = req.body;
    const newProduct = new Product({ name, category, price, corporatePrice, cost, stock });
    const product = await newProduct.save();
    
    // Notifier tous les clients que les produits ont changé
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });
    
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/products
// @desc    Obtenir tous les produits
// @access  Privé (Employés & Admins)
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find().sort({ category: 1, name: 1 });
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
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Notifier tous les clients que les produits ont changé
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Supprimer un produit
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    await product.deleteOne();

    // Notifier tous les clients que les produits ont changé
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });

    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PUT /api/products/restock/:id
// @desc    Réapprovisionner un produit (changer son stock)
// @access  Privé (Employés & Admins)
router.put('/restock/:id', protect, async (req, res) => {
  const { newStock } = req.body;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    const stockValue = parseInt(newStock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
        return res.status(400).json({ message: 'La valeur du stock est invalide.' });
    }
    
    // Sauvegarder l'ancien stock pour la notification
    const oldStock = product.stock;
    product.stock = stockValue;
    await product.save();

    // Envoyer notification webhook si le stock a changé
    if (oldStock !== stockValue) {
      await webhookService.notifyProductStockUpdate(product, oldStock, stockValue, req.user);
    }

    // Notifier tous les clients que les produits ont changé
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/products/stocks/bulk-update
// @desc    Mettre à jour en lot plusieurs stocks de produits
// @access  Privé/Admin
router.post('/stocks/bulk-update', protect, async (req, res) => {
  try {
    const updates = req.body.stocks; // [{ _id, stock }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Aucune modification à traiter.' });
    }
    const ids = updates.map(u => u._id);
    const existing = await Product.find({ _id: { $in: ids } });
    const existingMap = Object.fromEntries(existing.map(e => [e._id.toString(), e]));
    const notificationChanges = [];
    for (const up of updates) {
      const doc = existingMap[up._id];
      if (!doc) continue;
      const oldStock = doc.stock;
      if (oldStock !== up.stock) {
        notificationChanges.push({
          type: 'product',
          itemName: doc.name,
          oldStock,
          newStock: up.stock,
          user: req.user.username || req.user.email || 'Utilisateur inconnu',
          timestamp: new Date().toISOString()
        });
        doc.stock = up.stock;
        await doc.save();
      }
    }
    if (notificationChanges.length > 0) {
      await webhookService.sendGroupedStockUpdateNotification(notificationChanges);
    }
    req.io.emit('data-updated', { type: 'PRODUCTS_UPDATED' });
    res.json({ message: `${notificationChanges.length} stocks de produits modifiés.`, changes: notificationChanges });
  } catch (err) {
    console.error('Erreur bulk update produits :', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour groupée.' });
  }
});

export default router;