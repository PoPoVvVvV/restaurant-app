import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import InvitationCode from '../models/InvitationCode.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Enregistrer un nouvel employé avec un code d'invitation dynamique
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, invitationCode } = req.body;

  try {
    // 1. Trouver tous les codes valides (non utilisés, non expirés)
    const activeCodes = await InvitationCode.find({ isUsed: false, expiresAt: { $gt: new Date() } });
    let validCodeDoc = null;

    // 2. Chercher le code correspondant en comparant les versions hachées
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

    // 3. Vérifier si l'utilisateur existe déjà
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
    }

    // 4. Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Créer le nouvel utilisateur
    user = new User({
      username,
      password: hashedPassword,
      role: 'employe',
    });
    await user.save();

    // 6. Marquer le code comme utilisé
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
    if (!user) {
      return res.status(400).json({ message: 'Identifiants incorrects.' });
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

export default router;