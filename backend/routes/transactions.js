import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { protect, admin } from '../middleware/auth.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js';

const router = express.Router();

// @route   POST /api/transactions
// @desc    Créer une ou plusieurs transactions (gère la répartition)
// @access  Privé (Employé/Admin)
router.post('/', protect, async (req, res) => {
  const { cart, employeeIds } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' }).session(session);
    const currentWeekId = weekSetting?.value || 1;
    let totalAmount = 0;
    let totalCost = 0;
    const transactionProducts = [];
    const isCorporateSale = employeeIds && employeeIds.length > 0;

    // 1. Calculer les totaux et mettre à jour les stocks (si nécessaire)
    // D'abord, calculer les menus offerts pour la promotion "5 achetés = 1 offert"
    const freeMenusMap = new Map(); // Map<productId, freeQuantity>
    
    for (const item of cart) {
      if (item.category === 'Menus' && !isCorporateSale) {
        const freeCount = Math.floor(item.quantity / 5);
        if (freeCount > 0) {
          const currentFree = freeMenusMap.get(item._id) || 0;
          freeMenusMap.set(item._id, currentFree + freeCount);
        }
      }
    }

    // Vérifier d'abord que tous les stocks sont suffisants (produits achetés + menus offerts)
    if (!isCorporateSale) {
      for (const item of cart) {
        const product = await Product.findById(item._id).session(session);
        if (!product) {
          throw new Error(`Produit non trouvé : ${item.name || 'Produit inconnu'}`);
        }
        
        // Calculer la quantité totale nécessaire (achetée + offerte si c'est un menu)
        let totalQuantityNeeded = item.quantity;
        if (item.category === 'Menus' && freeMenusMap.has(item._id)) {
          totalQuantityNeeded += freeMenusMap.get(item._id);
        }
        
        if (product.stock < totalQuantityNeeded) {
          throw new Error(`Stock insuffisant pour : ${product.name}. Stock disponible: ${product.stock}, Quantité requise: ${totalQuantityNeeded} (${item.quantity} acheté(s)${freeMenusMap.has(item._id) ? ` + ${freeMenusMap.get(item._id)} offert(s)` : ''})`);
        }
      }
    }

    // Déduire les stocks pour les produits achetés
    for (const item of cart) {
      if (!isCorporateSale) {
        const product = await Product.findById(item._id).session(session);
        product.stock -= item.quantity;
        await product.save({ session });
      }
      totalAmount += item.price * item.quantity;
      totalCost += item.cost * item.quantity;
      transactionProducts.push({ productId: item._id, quantity: item.quantity, priceAtSale: item.price, costAtSale: item.cost, name: item.name, category: item.category });
    }

    // Déduire les stocks pour les menus offerts (promotion)
    if (!isCorporateSale) {
      for (const [productId, freeQuantity] of freeMenusMap.entries()) {
        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new Error(`Produit non trouvé pour le menu offert`);
        }
        // Le stock a déjà été vérifié ci-dessus, on peut directement déduire
        product.stock -= freeQuantity;
        await product.save({ session });
        
        // Ajouter les menus offerts à la transaction (avec prix 0)
        transactionProducts.push({
          productId: product._id,
          quantity: freeQuantity,
          priceAtSale: 0, // Gratuit
          costAtSale: product.cost, // Le coût reste pour la marge
          name: product.name,
          category: product.category
        });
        
        // Ajouter le coût des menus offerts au totalCost (mais pas au totalAmount car c'est gratuit)
        totalCost += product.cost * freeQuantity;
      }
    }
    const totalMargin = totalAmount - totalCost;

    // 2. Déterminer la liste des employés cibles
    const targetEmployeeIds = isCorporateSale ? employeeIds : [req.user.id];
      
    const employeeCount = targetEmployeeIds.length;
    const dividedAmount = totalAmount / employeeCount;
    const dividedCost = totalCost / employeeCount;
    const dividedMargin = totalMargin / employeeCount;

    // 3. Créer une transaction pour chaque employé
    for (const empId of targetEmployeeIds) {
      const newTransaction = new Transaction({
        weekId: currentWeekId,
        employeeId: empId,
        products: transactionProducts,
        totalAmount: dividedAmount,
        totalCost: dividedCost,
        margin: dividedMargin,
        saleType: isCorporateSale ? 'entreprise' : 'particulier'
      });
      await newTransaction.save({ session });
    }
    
    await session.commitTransaction();
    req.io.emit('data-updated', { type: 'TRANSACTIONS_UPDATED' });

    // 4. Notifier Discord
    const webhookUrl = process.env.DISCORD_SALES_WEBHOOK_URL;
    if (webhookUrl) {
        const productList = transactionProducts.map(p => `• ${p.quantity} x ${p.name}`).join('\n');
        const embed = {
            author: { name: `Vente enregistrée par ${req.user.username}` },
            title: `Transaction de ${totalAmount.toFixed(2)}$`,
            description: `Vente répartie sur ${employeeCount} employé(s).`,
            color: 5763719,
            fields: [ { name: "Produits Vendus", value: productList }, { name: "Marge Brute Totale", value: `$${totalMargin.toFixed(2)}` } ],
            timestamp: new Date().toISOString(),
        };
        axios.post(webhookUrl, { embeds: [embed] }).catch(err => console.error("Erreur Webhook Ventes:", err.message));
    }

    res.status(201).json({ message: `Transaction de ${totalAmount.toFixed(2)}$ répartie entre ${employeeCount} employé(s) !` });

  } catch (error) {
    await session.abortTransaction();
    console.error("Erreur lors de la création de la transaction:", error);
    res.status(400).json({ message: error.message || "Erreur lors de la création de la transaction." });
  } finally {
    session.endSession();
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Supprimer une transaction (Admin)
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction non trouvée' });
    }
    await transaction.deleteOne();
    
    req.io.emit('data-updated', { type: 'TRANSACTIONS_UPDATED' });
    
    res.json({ message: 'Transaction supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});


// @route   GET /api/transactions/me
// @desc    Obtenir l'historique de l'employé pour la semaine en cours
// @access  Privé (Employé)
router.get('/me', protect, async (req, res) => {
  try {
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
    const currentWeekId = weekSetting?.value || 1;
    // Utiliser lean() pour améliorer les performances (retourne des objets JS simples)
    const transactions = await Transaction.find({ employeeId: req.user.id, weekId: currentWeekId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

// @route   GET /api/transactions
// @desc    Obtenir TOUTES les transactions pour une semaine donnée (avec pagination)
// @access  Privé/Admin
router.get('/', [protect, admin], async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
      weekIdToFetch = parseInt(req.query.week, 10);
    } else {
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
      weekIdToFetch = weekSetting?.value || 1;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    
    const [transactions, total] = await Promise.all([
      Transaction.find({ weekId: weekIdToFetch })
        .populate('employeeId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // lean() pour améliorer les performances
      Transaction.countDocuments({ weekId: weekIdToFetch })
    ]);
    
    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

export default router;