import jwt from 'jsonwebtoken';

// Middleware pour vérifier le token (déjà créé en théorie)
export const protect = (req, res, next) => {
  // Logique de base : on suppose que le token est dans l'en-tête
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si le token a la structure attendue
    if (decoded && decoded.user) {
      // Si le token contient un objet user, l'utiliser directement
      req.user = decoded.user;
    } else if (decoded.id) {
      // Si le token contient directement les propriétés de l'utilisateur
      req.user = {
        _id: decoded.id,
        role: decoded.role,
        username: decoded.username,
        grade: decoded.grade
      };
    } else {
      // Si la structure du token n'est pas reconnue
      console.error('Structure de token non reconnue:', decoded);
      return res.status(400).json({ message: 'Structure de token invalide.' });
    }
    
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