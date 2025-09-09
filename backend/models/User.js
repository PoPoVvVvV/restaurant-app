import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Le nom d'utilisateur est obligatoire"],
    unique: true,
    trim: true,
    index: true, // Index pour les recherches par username
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
  },
  role: {
    type: String,
    enum: ['employe', 'admin'],
    default: 'employe',
    index: true, // Index pour filtrer par rôle
  },
  grade: {
    type: String,
    enum: ['Novice', 'Confirmé', 'Expérimenté', 'Manageuse', 'Co-Patronne', 'Patron'],
    default: 'Novice',
    index: true, // Index pour filtrer par grade
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true, // Index pour filtrer les utilisateurs actifs
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true, // Index pour trier par date de création
  },
  lastLogin: {
    type: Date,
    index: true, // Index pour trier par dernière connexion
  },
}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  versionKey: false, // Désactive le champ __v
});

// Index composé pour optimiser les requêtes courantes
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ grade: 1, isActive: 1 });
UserSchema.index({ createdAt: -1, isActive: 1 });

// Middleware pre-save pour la validation
UserSchema.pre('save', function(next) {
  if (this.isModified('username')) {
    this.username = this.username.toLowerCase();
  }
  next();
});

const User = mongoose.model('User', UserSchema);

export default User;