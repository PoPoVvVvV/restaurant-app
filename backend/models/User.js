import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Le nom d'utilisateur est obligatoire"],
    unique: true,
    trim: false,
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
  },
  role: {
    type: String,
    enum: ['employe', 'admin'],
    default: 'employe',
  },
  grade: {
    type: String,
    enum: ['Novice', 'Confirmé', 'Expérimenté', 'Manageuse', 'Co-Patronne', 'Patron'],
    default: 'Novice'
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes pour optimiser les requêtes fréquentes
UserSchema.index({ username: 1 }); // Déjà unique, mais index explicite
UserSchema.index({ isActive: 1 });
UserSchema.index({ role: 1 });

const User = mongoose.model('User', UserSchema);

export default User;