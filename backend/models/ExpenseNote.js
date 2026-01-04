import mongoose from 'mongoose';

const ExpenseNoteSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  firstName: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'La date est obligatoire'],
    default: Date.now,
  },
  imageUrl: {
    type: String,
    required: [true, 'Le lien de l\'image est obligatoire'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: [0, 'Le montant doit être positif'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes pour optimiser les requêtes fréquentes
ExpenseNoteSchema.index({ employeeId: 1, createdAt: -1 });
ExpenseNoteSchema.index({ status: 1 });
ExpenseNoteSchema.index({ createdAt: -1 });

const ExpenseNote = mongoose.model('ExpenseNote', ExpenseNoteSchema);

export default ExpenseNote;

