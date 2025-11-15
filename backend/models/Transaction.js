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
      quantity: {
        type: Number,
        required: true,
      },
      priceAtSale: {
        type: Number,
        required: true,
      },
      costAtSale: {
        type: Number,
        required: true,
      },
      name: {
        type: String
      },
      category: {
        type: String
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  margin: {
    type: Number,
    required: true,
  },
  saleType: {
    type: String,
    enum: ['particulier', 'entreprise'],
    default: 'particulier',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;