import mongoose from 'mongoose';
import ChristmasTransaction from '../models/ChristmasTransaction.js';
import ChristmasProduct from '../models/ChristmasProduct.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js';

export const createTransaction = async (req, res) => {
  console.log('Début de la création de transaction', { body: req.body, user: req.user });
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items = [], employeeIds = [] } = req.body;
    const userId = req.user?._id;
    
    // Validation des entrées
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Aucun article dans la commande');
    }
    
    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }
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
          weekId: currentWeekId,
          employeeId: employeeId,
          products: transactionProducts.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
            priceAtSale: p.priceAtSale,
            costAtSale: p.costAtSale,
            name: p.name,
            category: p.category
          })),
          totalAmount: dividedAmount,
          totalCost: dividedCost,
          margin: dividedMargin,
          saleType: isCorporateSale ? 'entreprise' : 'particulier',
          // Ajouter des champs supplémentaires si nécessaire
          description: `Vente Marché de Noël - ${transactionProducts.length} articles`
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
      employeeId: employeeId,
      weekId: currentWeekId,
      transactionIds: transactions.flatMap(t => t).map(t => t._id) // Aplatir le tableau de tableaux
    });

    console.log('Tentative de sauvegarde de la transaction', { 
      itemsCount: items.length,
      totalAmount,
      totalCost,
      userId,
      employeeId,
      weekId: currentWeekId
    });
    
    const savedTransaction = await christmasTransaction.save({ session });
    console.log('Transaction sauvegardée avec succès', { transactionId: savedTransaction._id });
    
    await session.commitTransaction();
    session.endSession();
    console.log('Transaction validée en base de données');

    // Notifier les clients de la mise à jour
    const transactionIds = transactions.flatMap(t => t).map(t => t._id);
    req.io.emit('data-updated', { 
      type: 'CHRISTMAS_PRODUCTS_UPDATED',
      transactionIds: transactionIds
    });

    res.status(201).json({
      message: 'Transaction enregistrée avec succès',
      transaction: christmasTransaction,
      transactions: transactions.flat()
    });

  } catch (error) {
    console.error('ErROR DÉTAILLÉE:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errors: error.errors
    });
    
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    
    console.error('Erreur lors de la création de la transaction:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errors: error.errors
    });
    
    res.status(500).json({ 
      message: error.message || 'Erreur lors de la création de la transaction',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        errors: error.errors
      } : undefined
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
