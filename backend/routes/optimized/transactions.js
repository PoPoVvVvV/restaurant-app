import mongoose from 'mongoose';
import { protect, admin } from '../../middleware/auth.js';
import express from 'express';
import Transaction from '../../models/Transaction.js';
import Product from '../../models/Product.js';
import Setting from '../../models/Setting.js';
import { cacheMiddleware, invalidateCache } from '../../services/cache.js';

const router = express.Router();
const CACHE_KEY_CURRENT_WEEK_TRANSACTIONS = 'current_week_transactions';
const CACHE_TTL = 300; // 5 minutes

// Helper: get current week transactions query
const getCurrentWeekTransactionsQuery = async (weekId) => {
  return Transaction.find({ weekId })
    .populate('employeeId', 'username')
    .lean()
    .sort({ createdAt: -1 });
};

// @route   POST /api/transactions
// @desc    Créer une ou plusieurs transactions (gère la répartition)
// @access  Privé (Employé/Admin)
router.post('/', protect, async (req, res) => {
  const { cart, employeeIds } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Préchargement en batch des données nécessaires
    const [weekSetting, products] = await Promise.all([
      Setting.findOne({ key: 'currentWeekId' }).session(session).lean(),
      Product.find({ 
        _id: { $in: cart.map(item => item._id) }
      }).session(session).lean()
    ]);

    const currentWeekId = weekSetting?.value || 1;
    let totalAmount = 0;
    let totalCost = 0;
    const transactionProducts = [];
    const isCorporateSale = employeeIds && employeeIds.length > 0;
    const stockUpdates = [];

    // Créer un Map des produits pour un accès O(1)
    const productsMap = products.reduce((acc, product) => {
      acc[product._id.toString()] = product;
      return acc;
    }, {});

    // 1. Calculer les totaux et préparer les mises à jour de stock
    for (const item of cart) {
      const product = productsMap[item._id];
      if (!product) {
        throw new Error(`Produit inconnu: ${item._id}`);
      }

      let freeCount = 0;
      if (item.category === 'Menus') {
        freeCount = Math.floor(item.quantity / 5);
      }

      if (!isCorporateSale) {
        const totalToRemove = item.quantity + freeCount;
        if (product.stock < totalToRemove) {
          throw new Error(`Stock insuffisant pour : ${product.name}`);
        }
        stockUpdates.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $inc: { stock: -totalToRemove } }
          }
        });
      }

      totalAmount += item.price * item.quantity;
      totalCost += item.cost * item.quantity;
      transactionProducts.push({
        productId: item._id,
        quantity: item.quantity,
        priceAtSale: item.price,
        costAtSale: item.cost,
        name: item.name,
        category: item.category
      });
    }

    const totalMargin = totalAmount - totalCost;
    const targetEmployeeIds = isCorporateSale ? employeeIds : [req.user.id];
    const employeeCount = targetEmployeeIds.length;
    const dividedAmount = totalAmount / employeeCount;
    const dividedCost = totalCost / employeeCount;
    const dividedMargin = totalMargin / employeeCount;

    // 2. Exécuter les mises à jour de stock en batch si nécessaire
    if (!isCorporateSale && stockUpdates.length > 0) {
      await Product.bulkWrite(stockUpdates, { session });
    }

    // 3. Créer les transactions en batch
    const transactions = targetEmployeeIds.map(empId => ({
      weekId: currentWeekId,
      employeeId: empId,
      products: transactionProducts,
      totalAmount: dividedAmount,
      totalCost: dividedCost,
      margin: dividedMargin,
      saleType: isCorporateSale ? 'entreprise' : 'particulier'
    }));

    await Transaction.insertMany(transactions, { session });
    await session.commitTransaction();

    // 4. Invalider le cache et notifier
    invalidateCache(CACHE_KEY_CURRENT_WEEK_TRANSACTIONS);
    req.io.emit('data-updated', { type: 'TRANSACTIONS_UPDATED' });

    // 5. Notifier Discord de manière asynchrone (ne pas attendre la réponse)
    const webhookUrl = process.env.DISCORD_SALES_WEBHOOK_URL;
    if (webhookUrl) {
      const productList = transactionProducts
        .map(p => `• ${p.quantity} x ${p.name}`)
        .join('\n');
      
      const embed = {
        author: { name: `Vente enregistrée par ${req.user.username}` },
        title: `Transaction de ${totalAmount.toFixed(2)}$`,
        description: `Vente répartie sur ${employeeCount} employé(s).`,
        color: 5763719,
        fields: [
          { name: "Produits Vendus", value: productList },
          { name: "Marge Brute Totale", value: `$${totalMargin.toFixed(2)}` }
        ],
        timestamp: new Date().toISOString()
      };

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      }).catch(err => console.error("Erreur Webhook Ventes:", err.message));
    }

    res.status(201).json({
      message: `Transaction de ${totalAmount.toFixed(2)}$ répartie entre ${employeeCount} employé(s) !`
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Erreur lors de la création de la transaction:", error);
    res.status(400).json({
      message: error.message || "Erreur lors de la création de la transaction."
    });
  } finally {
    session.endSession();
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Supprimer une transaction (Admin)
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findById(req.params.id).session(session);
    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Transaction non trouvée' });
    }

    await transaction.deleteOne({ session });
    await session.commitTransaction();
    
    invalidateCache(CACHE_KEY_CURRENT_WEEK_TRANSACTIONS);
    req.io.emit('data-updated', { type: 'TRANSACTIONS_UPDATED' });
    
    res.json({ message: 'Transaction supprimée' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Erreur du serveur' });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/transactions/me
// @desc    Obtenir l'historique de l'employé pour la semaine en cours
// @access  Privé (Employé)
router.get('/me', protect, cacheMiddleware(`transactions_me_`, CACHE_TTL), async (req, res) => {
  try {
    const [weekSetting, transactions] = await Promise.all([
      Setting.findOne({ key: 'currentWeekId' }).lean(),
      Transaction.find({
        employeeId: req.user.id,
        weekId: weekSetting?.value || 1
      })
        .lean()
        .sort({ createdAt: -1 })
    ]);

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
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' }).lean();
      weekIdToFetch = weekSetting?.value || 1;
    }

    // Utiliser le cache uniquement pour la semaine courante
    const cacheKey = `transactions_week_${weekIdToFetch}`;
    const cachedData = await getCurrentWeekTransactionsQuery(weekIdToFetch);
    res.json(cachedData);
    
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

export default router;