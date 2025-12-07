import mongoose from 'mongoose';
import ChristmasTransaction from '../models/ChristmasTransaction.js';
import ChristmasProduct from '../models/ChristmasProduct.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js';

export const createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, employeeIds } = req.body;
    const userId = req.user?._id;
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' }).session(session);
    const currentWeekId = weekSetting?.value || 1;

    // 1. Vérifier les stocks et calculer les totaux
    let totalAmount = 0;
    let totalCost = 0;
    const employeeId = req.user._id; // Récupérer l'ID de l'employé connecté
    const transactionProducts = [];
    const isCorporateSale = employeeIds && employeeIds.length > 0;

    for (const item of items) {
      const product = await ChristmasProduct.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Produit non trouvé: ${item.name}`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock}`);
      }

      // Mettre à jour le stock
      product.stock -= item.quantity;
      await product.save({ session });

      // Calculer les totaux
      const itemCost = product.cost * item.quantity;
      const itemAmount = item.price * item.quantity;
      totalAmount += itemAmount;
      totalCost += itemCost;
      
      transactionProducts.push({
        productId: product._id,
        quantity: item.quantity,
        priceAtSale: item.price,
        costAtSale: product.cost,
        name: product.name,
        category: product.category
      });
    }

    const totalMargin = totalAmount - totalCost;

    // 2. Gérer la répartition entre les employés
    const targetEmployeeIds = isCorporateSale ? employeeIds : [userId];
    const employeeCount = targetEmployeeIds.length;
    const dividedAmount = totalAmount / employeeCount;
    const dividedCost = totalCost / employeeCount;
    const dividedMargin = totalMargin / employeeCount;

    // 3. Créer les transactions pour chaque employé
    const transactions = await Promise.all(
      targetEmployeeIds.map(employeeId => 
        Transaction.create([{
          type: 'income',
          amount: dividedAmount,
          cost: dividedCost,
          margin: dividedMargin,
          description: `Vente Marché de Noël - ${transactionProducts.length} articles`,
          category: 'Vente',
          user: employeeId,
          weekId: currentWeekId,
          details: {
            products: transactionProducts,
            isChristmasSale: true
          }
        }], { session })
      )
    );

    // 4. Créer l'entrée dans la table ChristmasTransaction
    const christmasTransaction = new ChristmasTransaction({
      items: items.map((item, index) => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        cost: transactionProducts[index]?.costAtSale || 0,
        name: item.name,
        category: item.category
      })),
      totalAmount: totalAmount,
      totalCost: totalCost,
      margin: totalMargin,
      user: userId,
      employeeId: employeeId, // Ajout de l'ID de l'employé
      weekId: currentWeekId,
      transactionIds: transactions.map(t => t[0]._id)
    });

    await christmasTransaction.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Notifier les clients de la mise à jour
    req.io.emit('data-updated', { 
      type: 'CHRISTMAS_PRODUCTS_UPDATED',
      transactionIds: transactions.map(t => t[0]._id)
    });

    res.status(201).json({
      message: 'Transaction enregistrée avec succès',
      transaction: christmasTransaction,
      transactions: transactions.map(t => t[0])
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Erreur lors de la création de la transaction:', error);
    res.status(500).json({ 
      message: error.message || 'Erreur lors de la création de la transaction',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await ChristmasTransaction.find()
      .populate('user', 'name')
      .populate('items.product', 'name category price cost')
      .populate('transactionIds')
      .sort({ createdAt: -1 });
      
    res.json(transactions);
  } catch (err) {
    console.error('Erreur lors de la récupération des transactions:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des transactions',
      error: err.message
    });
  }
};
