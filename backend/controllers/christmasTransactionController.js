import ChristmasTransaction from '../models/ChristmasTransaction.js';
import ChristmasProduct from '../models/ChristmasProduct.js';

export const createTransaction = async (req, res) => {
  const session = await ChristmasTransaction.startSession();
  session.startTransaction();

  try {
    const { items } = req.body;
    
    // Vérifier d'abord tous les produits et le stock disponible
    for (const item of items) {
      const product = await ChristmasProduct.findById(item.product).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ message: `Produit non trouvé: ${item.name}` });
      }
      
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock}` 
        });
      }
    }
    
    // Calculer le total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Créer la transaction
    const transaction = new ChristmasTransaction({
      items,
      total
    });
    
    // Mettre à jour les stocks et créer la transaction dans une seule transaction
    for (const item of items) {
      await ChristmasProduct.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { session, new: true }
      );
    }
    
    await transaction.save({ session });
    await session.commitTransaction();
    
    // Notifier les clients de la mise à jour
    req.io.emit('data-updated', { type: 'CHRISTMAS_PRODUCTS_UPDATED' });
    
    res.status(201).json(transaction);
  } catch (err) {
    await session.abortTransaction();
    console.error('Erreur lors de la création de la transaction:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la création de la transaction',
      error: err.message 
    });
  } finally {
    session.endSession();
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await ChristmasTransaction.find()
      .sort({ createdAt: -1 })
      .populate('items.product', 'name category price');
    res.json(transactions);
  } catch (err) {
    console.error('Erreur lors de la récupération des transactions:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des transactions',
      error: err.message 
    });
  }
};
