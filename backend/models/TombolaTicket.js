import mongoose from 'mongoose';

const tombolaTicketSchema = new mongoose.Schema({
  ticketNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  purchaseDate: { 
    type: Date, 
    default: Date.now 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  isWinner: {
    type: Boolean,
    default: false
  },
  prize: {
    type: String,
    enum: ['first', 'second', 'third', null],
    default: null
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour les recherches fréquentes
tombolaTicketSchema.index({ ticketNumber: 1 });
tombolaTicketSchema.index({ isWinner: 1 });
tombolaTicketSchema.index({ user: 1 });
tombolaTicketSchema.index({ purchaseDate: -1 });

export default mongoose.model('TombolaTicket', tombolaTicketSchema);
