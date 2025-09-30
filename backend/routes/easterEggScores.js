import express from 'express';
import EasterEggScore from '../models/EasterEggScore.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/easter-egg-scores
// @desc    Enregistrer un nouveau score
// @access  Privé
router.post('/', protect, async (req, res) => {
  try {
    const { easterEggType, score, level, duration, snakeLength, gameData } = req.body;

    console.log('Données reçues:', { easterEggType, score, level, duration, snakeLength, gameData });
    console.log('Utilisateur complet:', req.user);
    console.log('Utilisateur ID:', req.user.id);
    console.log('Utilisateur ID type:', typeof req.user.id);

    // Validation des données
    if (!easterEggType || score === undefined || level === undefined || duration === undefined || snakeLength === undefined) {
      console.log('Données manquantes:', { easterEggType, score, level, duration, snakeLength });
      return res.status(400).json({ message: 'Données manquantes pour enregistrer le score' });
    }

    if (score < 0 || level < 1 || duration < 0 || snakeLength < 1) {
      console.log('Données invalides:', { score, level, duration, snakeLength });
      return res.status(400).json({ message: 'Données invalides' });
    }

    // Vérifier que l'utilisateur a un ID valide
    if (!req.user.id) {
      console.log('Utilisateur sans ID valide');
      return res.status(400).json({ message: 'Utilisateur non authentifié correctement' });
    }

    // Vérifier que l'utilisateur a un nom d'utilisateur
    if (!req.user.username && !req.user.email) {
      console.log('Utilisateur sans nom d\'utilisateur ou email');
      return res.status(400).json({ message: 'Utilisateur invalide' });
    }

    // Vérifier que le modèle est disponible
    if (!EasterEggScore) {
      console.error('Modèle EasterEggScore non disponible');
      return res.status(500).json({ message: 'Modèle de données non disponible' });
    }

    // Créer le nouveau score
    const newScore = new EasterEggScore({
      userId: req.user.id,
      username: req.user.username || req.user.email || 'Utilisateur inconnu',
      easterEggType,
      score,
      level,
      duration,
      snakeLength,
      gameData: gameData || {}
    });

    console.log('Tentative de sauvegarde du score:', newScore.toObject());
    await newScore.save();

    console.log('Score enregistré avec succès:', newScore._id);

    res.status(201).json({
      message: 'Score enregistré avec succès',
      score: {
        id: newScore._id,
        score: newScore.score,
        level: newScore.level,
        duration: newScore.duration,
        snakeLength: newScore.snakeLength,
        createdAt: newScore.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du score:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Erreur du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @route   GET /api/easter-egg-scores/leaderboard/:easterEggType
// @desc    Obtenir le classement pour un easter-egg
// @access  Privé
router.get('/leaderboard/:easterEggType', protect, async (req, res) => {
  try {
    const { easterEggType } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    if (limit > 50) {
      return res.status(400).json({ message: 'Limite maximale de 50' });
    }

    const leaderboard = await EasterEggScore.getLeaderboard(easterEggType, limit);
    
    res.json({
      easterEggType,
      leaderboard,
      total: leaderboard.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du classement:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/easter-egg-scores/my-best/:easterEggType
// @desc    Obtenir le meilleur score de l'utilisateur pour un easter-egg
// @access  Privé
router.get('/my-best/:easterEggType', protect, async (req, res) => {
  try {
    const { easterEggType } = req.params;

    const bestScore = await EasterEggScore.getUserBestScore(req.user.id, easterEggType);
    
    res.json({
      easterEggType,
      bestScore: bestScore || null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du meilleur score:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/easter-egg-scores/stats/:easterEggType
// @desc    Obtenir les statistiques globales pour un easter-egg
// @access  Privé
router.get('/stats/:easterEggType', protect, async (req, res) => {
  try {
    const { easterEggType } = req.params;

    const stats = await EasterEggScore.getStats(easterEggType);
    
    res.json({
      easterEggType,
      stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/easter-egg-scores/my-scores/:easterEggType
// @desc    Obtenir tous les scores de l'utilisateur pour un easter-egg
// @access  Privé
router.get('/my-scores/:easterEggType', protect, async (req, res) => {
  try {
    const { easterEggType } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const scores = await EasterEggScore.find({ 
      userId: req.user.id, 
      easterEggType 
    })
    .sort({ score: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('score level duration snakeLength createdAt')
    .lean();

    const total = await EasterEggScore.countDocuments({ 
      userId: req.user._id, 
      easterEggType 
    });
    
    res.json({
      easterEggType,
      scores,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des scores utilisateur:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;
