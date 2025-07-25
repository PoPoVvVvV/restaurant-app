import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import InvitationCode from '../models/InvitationCode.js';
import PasswordResetToken from '../models/PasswordResetToken.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Enregistrer un nouvel employé avec un code d'invitation dynamique
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, invitationCode } = req.body;

  try {
    const activeCodes = await InvitationCode.find({ isUsed: false, expiresAt: { $gt: new Date() } });
    let validCodeDoc = null;

    for (const codeDoc of activeCodes) {
      const isMatch = await bcrypt.compare(invitationCode, codeDoc.code);
      if (isMatch) {
        validCodeDoc = codeDoc;
        break;
      }
    }

    if (!validCodeDoc) {
      return res.status(400).json({ message: "Code d'invitation invalide, expiré ou déjà utilisé." });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      password: hashedPassword,
      role: 'employe',
    });
    await user.save();

    validCodeDoc.isUsed = true;
    await validCodeDoc.save();

    res.status(201).json({ message: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.' });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Erreur du serveur');
  }
});


// @route   POST /api/auth/login
// @desc    Connecter un utilisateur et renvoyer un token
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || !user.isActive) {
      return res.status(400).json({ message: 'Identifiants incorrects ou compte désactivé.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants incorrects.' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        grade: user.grade
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Demander une réinitialisation de mot de passe
router.post('/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.status(404).send('Utilisateur non trouvé.');

        let resetToken = await PasswordResetToken.findOne({ userId: user._id });
        if (resetToken) await resetToken.deleteOne();

        const token = crypto.randomBytes(32).toString('hex');
        await new PasswordResetToken({ userId: user._id, token }).save();
        
        res.send("Une demande de réinitialisation a été envoyée à l'administrateur.");
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur du serveur');
    }
});

// @route   POST /api/auth/reset-password
// @desc    Réinitialiser le mot de passe avec un token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if(!token || !newPassword) {
            return res.status(400).send('Token et nouveau mot de passe requis.');
        }

        const resetToken = await PasswordResetToken.findOne({ token });
        if (!resetToken) return res.status(400).send('Token invalide ou expiré.');

        const user = await User.findById(resetToken.userId);
        if (!user) return res.status(404).send('Utilisateur associé au token non trouvé.');

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        await resetToken.deleteOne();

        res.send('Mot de passe réinitialisé avec succès.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur du serveur');
    }
});


export default router;