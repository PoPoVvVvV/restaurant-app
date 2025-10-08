import express from 'express';
import mongoose from 'mongoose';
import EasterEggScore from '../models/EasterEggScore.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
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

    // Vérifier s'il existe déjà un score pour cet utilisateur et cet easter-egg
    const existingScore = await EasterEggScore.findOne({
      userId: req.user.id,
      easterEggType
    });

    let newScore;
    let isNewRecord = false;
    let isScoreRejected = false;

    if (existingScore) {
      // Vérifier si le nouveau score est supérieur au score existant
      if (score > existingScore.score) {
        // Remplacer le score existant par le nouveau (plus élevé)
        existingScore.score = score;
        existingScore.level = level;
        existingScore.duration = duration;
        existingScore.snakeLength = snakeLength;
        existingScore.gameData = gameData || {};
        existingScore.updatedAt = new Date();
        
        console.log('Nouveau record ! Mise à jour du score:', existingScore.toObject());
        await existingScore.save();
        newScore = existingScore;
        isNewRecord = true;
      } else {
        // Le nouveau score est inférieur ou égal, ne pas l'enregistrer
        console.log(`Score rejeté: ${score} <= ${existingScore.score} (score existant)`);
        isScoreRejected = true;
        newScore = existingScore; // Retourner le score existant pour l'affichage
      }
    } else {
      // Créer un nouveau score (premier score de l'utilisateur)
      newScore = new EasterEggScore({
        userId: req.user.id,
        username: req.user.username || req.user.email || 'Utilisateur inconnu',
        easterEggType,
        score,
        level,
        duration,
        snakeLength,
        gameData: gameData || {}
      });

      console.log('Premier score enregistré:', newScore.toObject());
      await newScore.save();
      isNewRecord = true;
    }

    // Déterminer le message de réponse
    let responseMessage;
    let responseStatus = 201;

    if (isScoreRejected) {
      responseMessage = `Score de ${score} points non enregistré. Votre meilleur score reste ${existingScore.score} points.`;
      responseStatus = 200; // OK mais pas de création/mise à jour
    } else if (isNewRecord && existingScore) {
      responseMessage = `🎉 Nouveau record ! ${score} points (précédent: ${existingScore.score})`;
    } else if (isNewRecord) {
      responseMessage = `Premier score enregistré : ${score} points !`;
    } else {
      responseMessage = 'Score enregistré avec succès';
    }

    console.log('Réponse:', { isNewRecord, isScoreRejected, message: responseMessage });

    res.status(responseStatus).json({
      message: responseMessage,
      isNewRecord,
      isScoreRejected,
      score: {
        id: newScore._id,
        score: newScore.score,
        level: newScore.level,
        duration: newScore.duration,
        snakeLength: newScore.snakeLength,
        createdAt: newScore.createdAt,
        updatedAt: newScore.updatedAt
      },
      previousScore: existingScore && isNewRecord ? existingScore.score : null
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
// @desc    Obtenir le score de l'utilisateur pour un easter-egg (unique)
// @access  Privé
router.get('/my-scores/:easterEggType', protect, async (req, res) => {
  try {
    const { easterEggType } = req.params;

    const score = await EasterEggScore.findOne({ 
      userId: req.user.id, 
      easterEggType 
    })
    .select('score level duration snakeLength createdAt updatedAt')
    .lean();

    res.json({
      easterEggType,
      score: score || null,
      hasScore: !!score
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du score:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/easter-egg-scores/check-unlock/:easterEggType
// @desc    Vérifier si un easter-egg est débloqué pour l'utilisateur
// @access  Privé
router.get('/check-unlock/:easterEggType', protect, async (req, res) => {
  try {
    const { easterEggType } = req.params;

    if (easterEggType === 'flappy-bird') {
      // Pour Flappy Bird, vérifier si l'utilisateur a un CA total > 20000$
      // Convertir l'ID en ObjectId pour la requête MongoDB
      const userId = new mongoose.Types.ObjectId(req.user.id);
      
      const totalCA = await Transaction.aggregate([
        { $match: { employeeId: userId } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ]);

      const userTotalCA = totalCA[0]?.totalRevenue || 0;
      const isUnlocked = userTotalCA >= 20000;

      // Debug: Log des informations
      console.log(`[DEBUG] Vérification Flappy Bird pour ${req.user.username} (ID: ${req.user.id})`);
      console.log(`[DEBUG] ObjectId converti: ${userId}`);
      console.log(`[DEBUG] CA total calculé: $${userTotalCA}`);
      console.log(`[DEBUG] Seuil requis: $20000`);
      console.log(`[DEBUG] Débloqué: ${isUnlocked}`);

      res.json({
        easterEggType,
        isUnlocked,
        unlockCondition: {
          type: 'totalCA',
          required: 20000,
          current: userTotalCA,
          progress: Math.min((userTotalCA / 20000) * 100, 100)
        }
      });
    } else if (easterEggType === 'snake-game') {
      // Pour Snake, utiliser la logique existante (séquence de clics)
      // Cette logique est gérée côté frontend dans EasterEggContext
      res.json({
        easterEggType,
        isUnlocked: true, // Snake est débloqué par défaut si l'utilisateur peut y accéder
        unlockCondition: {
          type: 'sequence',
          description: 'Séquence de navigation secrète'
        }
      });
    } else {
      res.status(400).json({ message: 'Type d\'easter-egg non supporté' });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du déblocage:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/easter-egg-scores/debug-ca/:userId
// @desc    Debug: Vérifier le CA total pour un utilisateur spécifique
// @access  Privé (Admin)
router.get('/debug-ca/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier si l'utilisateur est admin
    if (req.user.grade !== 'Patron' && req.user.grade !== 'Co-Patronne') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Récupérer les informations de l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Calculer le CA total
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const totalCA = await Transaction.aggregate([
      { $match: { employeeId: userIdObjectId } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    // Récupérer toutes les transactions pour plus de détails
    const transactions = await Transaction.find({ employeeId: userIdObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('totalAmount weekId saleType createdAt');

    const userTotalCA = totalCA[0]?.totalRevenue || 0;
    const isUnlocked = userTotalCA >= 20000;

    res.json({
      user: {
        id: user._id,
        username: user.username,
        grade: user.grade
      },
      ca: {
        total: userTotalCA,
        isUnlocked,
        threshold: 20000,
        progress: Math.min((userTotalCA / 20000) * 100, 100)
      },
      recentTransactions: transactions,
      debug: {
        totalTransactions: transactions.length,
        aggregationResult: totalCA
      }
    });
  } catch (error) {
    console.error('Erreur lors du debug CA:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});


export default router;
