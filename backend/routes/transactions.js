import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { protect, admin } from '../middleware/auth.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js';

const router = express.Router();

// @route   POST /api/transactions
// @desc    Créer une nouvelle transaction et notifier Discord
// @access  Privé (Employé)
router.post('/', protect, async (req, res) => {
  const { cart } = req.body;
  const employeeId = req.user.id;
  const employeeName = req.user.username;
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' }).session(session);
    const currentWeekId = weekSetting?.value || 1;
    let totalAmount = 0;
    let totalCost = 0;
    const transactionProducts = [];

    for (const item of cart) {
      const product = await Product.findById(item._id).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Stock insuffisant pour : ${product?.name || 'Produit inconnu'}`);
      }
      product.stock -= item.quantity;
      await product.save({ session });
      totalAmount += item.price * item.quantity;
      totalCost += item.cost * item.quantity;
      transactionProducts.push({ productId: product._id, quantity: item.quantity, priceAtSale: product.price, costAtSale: product.cost, name: product.name });
    }

    const newTransaction = new Transaction({
      weekId: currentWeekId,
      employeeId,
      products: transactionProducts,
      totalAmount,
      totalCost,
      margin: totalAmount - totalCost
    });
    
    await newTransaction.save({ session });
    await session.commitTransaction();

    // Envoi de la notification sur Discord
    const webhookUrl = process.env.DISCORD_SALES_WEBHOOK_URL;
    if (webhookUrl) {
        const productList = transactionProducts.map(p => `• ${p.quantity} x ${p.name}`).join('\n');
        const embed = {
            author: { name: `Nouvelle vente par ${employeeName}` },
            title: `Transaction de ${totalAmount.toFixed(2)}$`,
            color: 5763719, // Vert
            fields: [
                { name: "Produits Vendus", value: productList },
                { name: "Marge Brute", value: `$${(totalAmount - totalCost).toFixed(2)}`, inline: true },
            ],
            timestamp: new Date().toISOString(),
        };
        axios.post(webhookUrl, { embeds: [embed] }).catch(err => console.error("Erreur Webhook Ventes:", err.message));
    }

    res.status(201).json({ message: 'Transaction enregistrée avec succès !' });

  } catch (error) {
    await session.abortTransaction();
    console.error("Erreur lors de la création de la transaction:", error);
    res.status(400).json({ message: error.message || "Erreur lors de la création de la transaction." });
  } finally {
    session.endSession();
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