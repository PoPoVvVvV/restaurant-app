import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { protect, admin } from '../middleware/auth.js';
import User from '../models/User.js';
import InvitationCode from '../models/InvitationCode.js';
import PasswordResetToken from '../models/PasswordResetToken.js';

const router = express.Router();

// @route   POST /api/users/generate-code
// @desc    Générer un code d'invitation pour un nouvel employé
// @access  Privé/Admin
router.post('/generate-code', [protect, admin], async (req, res) => {
  try {
    const code = `${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomInt(100, 999)}`;
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(code, salt);
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 1); // Valide 24h

    const newCode = new InvitationCode({
      code: hashedCode,
      expiresAt: expiration
    });

    await newCode.save();
    res.status(201).json({ invitationCode: code });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/users
// @desc    Obtenir la liste de tous les utilisateurs
// @access  Privé (Employés & Admins)
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Activer ou désactiver un compte utilisateur
// @access  Privé/Admin
router.put('/:id/status', [protect, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    user.isActive = !user.isActive; 
    await user.save();
    res.json({ message: `Le statut de l'utilisateur ${user.username} a été mis à jour.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PUT /api/users/:id/grade
// @desc    Modifier le grade d'un utilisateur
// @access  Privé/Admin
router.put('/:id/grade', [protect, admin], async (req, res) => {
  try {
    const { grade } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const validGrades = ['Novice', 'Confirmé', 'Expérimenté', 'Manageuse', 'Co-Patronne', 'Patron'];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({ message: 'Grade non valide.' });
    }

    user.grade = grade;
    await user.save();
    res.json({ message: `Le grade de ${user.username} a été mis à jour.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Modifier le rôle d'un utilisateur (employe/admin)
// @access  Privé/Admin
router.put('/:id/role', [protect, admin], async (req, res) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.id;

    if (!role || typeof role !== 'string') {
      return res.status(400).json({ message: 'Rôle requis.' });
    }

    const normalizedRole = role.trim().toLowerCase();
    const validRoles = ['employe', 'admin'];
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: 'Rôle non valide.' });
    }

    // Empêcher un admin de se retirer ses propres droits (évite de se verrouiller)
    if (req.user && String(req.user._id) === String(targetUserId)) {
      return res.status(400).json({ message: 'Vous ne pouvez pas modifier votre propre rôle.' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.role = normalizedRole;
    await user.save();

    res.json({
      message: `Le rôle de ${user.username} a été mis à jour.`,
      user: { _id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/users/reset-tokens
// @desc    Obtenir les tokens de réinitialisation de mot de passe actifs
// @access  Privé/Admin
router.get('/reset-tokens', [protect, admin], async (req, res) => {
    try {
        const tokens = await PasswordResetToken.find().populate('userId', 'username');
        res.json(tokens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur du serveur' });
    }
});

// @route   DELETE /api/users/:id
// @desc    Supprimer un compte utilisateur désactivé (admin uniquement)
// @access  Privé/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Vérifier si le compte est actif
    if (user.isActive) {
      return res.status(400).json({ message: 'Impossible de supprimer un compte actif. Veuillez d\'abord le désactiver.' });
    }
    
    // Suppression du compte
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du compte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;