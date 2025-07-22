import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  weekId: {
    type: Number,
    required: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: { type: Number, required: true },
      priceAtSale: { type: Number, required: true },
      costAtSale: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true }, // CA de la transaction
  totalCost: { type: Number, required: true },   // Coût total des produits vendus
  margin: { type: Number, required: true },      // Marge brute
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;