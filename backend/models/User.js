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
  // Paramètres "salaire/prime" par utilisateur (prime basée sur la marge)
  // maxSalary: plafond du salaire estimé (en $)
  // allowMaxSalaryExceed: si true, le plafond peut être dépassé
  // salaryPercentageOfMargin: pourcentage (décimal, ex 0.1 = 10%) appliqué à la marge
  maxSalary: {
    type: Number,
    default: null,
    min: 0,
  },
  allowMaxSalaryExceed: {
    type: Boolean,
    default: false,
  },
  salaryPercentageOfMargin: {
    type: Number,
    // 50% par défaut
    default: 0.5,
    min: 0,
    max: 1,
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