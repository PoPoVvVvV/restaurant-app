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
    const isCorporateSale = req.user.role === 'admin' && employeeIds && employeeIds.length > 0;

    // 1. Calculer les totaux et mettre à jour les stocks (si nécessaire)
    for (const item of cart) {
      if (!isCorporateSale) {
        const product = await Product.findById(item._id).session(session);
        if (!product || product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour : ${product?.name || 'Produit inconnu'}`);
        }
        product.stock -= item.quantity;
        await product.save({ session });
      }
      totalAmount += item.price * item.quantity;
      totalCost += item.cost * item.quantity;
      transactionProducts.push({ productId: item._id, quantity: item.quantity, priceAtSale: item.price, costAtSale: item.cost, name: item.name, category: item.category });
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
        margin: dividedMargin
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
    const transactions = await Transaction.find({ employeeId: req.user.id, weekId: currentWeekId }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

// @route   GET /api/transactions
// @desc    Obtenir TOUTES les transactions pour une semaine donnée
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
    const transactions = await Transaction.find({ weekId: weekIdToFetch })
      .populate('employeeId', 'username')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

export default router;