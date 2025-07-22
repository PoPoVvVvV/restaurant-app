import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  weekId: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
  },
  category: {
    type: String,
    required: [true, 'La catégorie est obligatoire'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Ajouté par qui ? Utile pour la traçabilité
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
});

const Expense = mongoose.model('Expense', ExpenseSchema);
export default Expense;