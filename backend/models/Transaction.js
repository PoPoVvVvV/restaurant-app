import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  weekId: {
    type: Number,
    required: true,
    index: true, // Index pour filtrer par semaine
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // Index pour filtrer par employé
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
        min: 0,
      },
      priceAtSale: {
        type: Number,
        required: true,
        min: 0,
      },
      costAtSale: {
        type: Number,
        required: true,
        min: 0,
      },
      name: {
        type: String,
        trim: true,
      },
      category: {
        type: String,
        trim: true,
        index: true, // Index pour filtrer par catégorie
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
    index: true, // Index pour trier par montant
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  margin: {
    type: Number,
    required: true,
    index: true, // Index pour trier par marge
  },
  marginPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true, // Index pour trier par date
  },
  transactionType: {
    type: String,
    enum: ['sale', 'refund', 'corporate'],
    default: 'sale',
    index: true, // Index pour filtrer par type
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'other'],
    default: 'cash',
    index: true, // Index pour filtrer par méthode de paiement
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Index composés pour optimiser les requêtes courantes
TransactionSchema.index({ weekId: 1, employeeId: 1 });
TransactionSchema.index({ createdAt: -1, transactionType: 1 });
TransactionSchema.index({ totalAmount: -1, createdAt: -1 });
TransactionSchema.index({ 'products.category': 1, createdAt: -1 });

// Middleware pre-save pour calculer automatiquement la marge
TransactionSchema.pre('save', function(next) {
  if (this.totalAmount > 0) {
    this.marginPercentage = ((this.margin / this.totalAmount) * 100).toFixed(2);
  }
  next();
});

// Méthode statique pour obtenir les statistiques par semaine
TransactionSchema.statics.getWeeklyStats = function(weekId) {
  return this.aggregate([
    { $match: { weekId: weekId } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' },
        totalCost: { $sum: '$totalCost' },
        totalMargin: { $sum: '$margin' },
        transactionCount: { $sum: 1 },
        avgTransactionValue: { $avg: '$totalAmount' }
      }
    }
  ]);
};

// Méthode statique pour obtenir les statistiques par employé
TransactionSchema.statics.getEmployeeStats = function(employeeId, startDate, endDate) {
  const matchStage = { employeeId: new mongoose.Types.ObjectId(employeeId) };
  if (startDate && endDate) {
    matchStage.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$employeeId',
        totalAmount: { $sum: '$totalAmount' },
        totalCost: { $sum: '$totalCost' },
        totalMargin: { $sum: '$margin' },
        transactionCount: { $sum: 1 },
        avgTransactionValue: { $avg: '$totalAmount' }
      }
    }
  ]);
};

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;