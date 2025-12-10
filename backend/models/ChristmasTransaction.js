import mongoose from 'mongoose';

const christmasTransactionSchema = new mongoose.Schema({
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'ChristmasProduct', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    name: { type: String, required: true },
    category: { type: String, required: true }
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
  margin: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekId: { type: Number, required: true },
  transactionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }]
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
christmasTransactionSchema.index({ user: 1, weekId: 1 });
christmasTransactionSchema.index({ createdAt: -1 });

export default mongoose.model('ChristmasTransaction', christmasTransactionSchema);
