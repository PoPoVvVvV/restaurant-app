import mongoose from 'mongoose';

const AbsenceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['En attente', 'Validée', 'Refusée'],
    default: 'En attente',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Absence = mongoose.model('Absence', AbsenceSchema);
export default Absence;