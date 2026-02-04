import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware pour vérifier le token (déjà créé en théorie)
export const protect = async (req, res, next) => {
  // Logique de base : on suppose que le token est dans l'en-tête
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Récupérer l'ID utilisateur depuis les structures de token supportées
    const userId =
      decoded?.user?.id ||
      decoded?.user?._id ||
      decoded?.id ||
      decoded?._id;

    if (!userId) {
      // Si la structure du token n'est pas reconnue
      console.error('Structure de token non reconnue:', decoded);
      return res.status(400).json({ message: 'Structure de token invalide.' });
    }

    // Toujours recharger l'utilisateur depuis la base pour avoir le rôle/statut à jour
    const dbUser = await User.findById(userId).select('-password');
    if (!dbUser) {
      return res.status(401).json({ message: 'Utilisateur introuvable. Veuillez vous reconnecter.' });
    }
    if (dbUser.isActive === false) {
      return res.status(401).json({ message: 'Compte désactivé. Accès refusé.' });
    }
    req.user = dbUser;
    
    console.log('Utilisateur authentifié:', { userId: req.user._id, role: req.user.role });
    next();
  } catch (e) {
    console.error('Erreur de vérification du token:', e.message);
    res.status(401).json({ 
      message: 'Session expirée ou invalide. Veuillez vous reconnecter.',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
};

// Middleware pour vérifier le rôle admin
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Accès refusé, droits d'administrateur requis." });
  }
};