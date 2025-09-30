import mongoose from 'mongoose';

const EasterEggScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  easterEggType: {
    type: String,
    required: true,
    enum: ['snake-game']
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  level: {
    type: Number,
    required: true,
    min: 1
  },
  duration: {
    type: Number, // en secondes
    required: true,
    min: 0
  },
  snakeLength: {
    type: Number,
    required: true,
    min: 1
  },
  gameData: {
    type: mongoose.Schema.Types.Mixed, // Pour stocker des données supplémentaires
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour les requêtes de classement
EasterEggScoreSchema.index({ easterEggType: 1, score: -1 });
EasterEggScoreSchema.index({ easterEggType: 1, createdAt: -1 });
EasterEggScoreSchema.index({ userId: 1, easterEggType: 1 });

// Index unique pour s'assurer qu'un utilisateur n'a qu'un seul score par easter-egg
EasterEggScoreSchema.index({ userId: 1, easterEggType: 1 }, { unique: true });

// Méthode statique pour obtenir le classement
EasterEggScoreSchema.statics.getLeaderboard = async function(easterEggType, limit = 10) {
  return this.find({ easterEggType })
    .sort({ score: -1, createdAt: 1 })
    .limit(limit)
    .select('username score level duration snakeLength createdAt')
    .lean();
};

// Méthode statique pour obtenir le score d'un utilisateur (unique par easter-egg)
EasterEggScoreSchema.statics.getUserBestScore = async function(userId, easterEggType) {
  return this.findOne({ userId, easterEggType })
    .select('score level duration snakeLength createdAt updatedAt')
    .lean();
};

// Méthode statique pour obtenir les statistiques globales
EasterEggScoreSchema.statics.getStats = async function(easterEggType) {
  const stats = await this.aggregate([
    { $match: { easterEggType } },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        totalPlayers: { $addToSet: '$userId' },
        averageScore: { $avg: '$score' },
        maxScore: { $max: '$score' },
        minScore: { $min: '$score' },
        averageDuration: { $avg: '$duration' },
        averageSnakeLength: { $avg: '$snakeLength' }
      }
    },
    {
      $project: {
        _id: 0,
        totalGames: 1,
        totalPlayers: { $size: '$totalPlayers' },
        averageScore: { $round: ['$averageScore', 2] },
        maxScore: 1,
        minScore: 1,
        averageDuration: { $round: ['$averageDuration', 2] },
        averageSnakeLength: { $round: ['$averageSnakeLength', 2] }
      }
    }
  ]);

  return stats[0] || {
    totalGames: 0,
    totalPlayers: 0,
    averageScore: 0,
    maxScore: 0,
    minScore: 0,
    averageDuration: 0,
    averageSnakeLength: 0
  };
};

export default mongoose.model('EasterEggScore', EasterEggScoreSchema);
