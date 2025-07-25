import mongoose from 'mongoose';

const PasswordResetTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '1h' }, // Le token expire en 1 heure
});

const PasswordResetToken = mongoose.model('PasswordResetToken', PasswordResetTokenSchema);
export default PasswordResetToken;