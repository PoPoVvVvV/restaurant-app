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
    req.user = decoded.user;
    next();
  } catch (e) {
    res.status(400).json({ message: 'Token invalide.' });
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