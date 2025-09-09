import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { requestLogger, errorLogger, performanceMonitor, logger } from './middleware/monitoring.js';

// Importer toutes vos routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import recipeRoutes from './routes/recipes.js';
import ingredientRoutes from './routes/ingredients.js';
import absenceRoutes from './routes/absences.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configuration des variables d'environnement
const clientURL = process.env.CLIENT_URL || 'https://restaurant-app-coral-six.vercel.app';
const isProduction = process.env.NODE_ENV === 'production';

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Compression gzip
app.use(compression());

// Monitoring et logging
app.use(requestLogger);
app.use(performanceMonitor);

// Logging
if (isProduction) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      clientURL,
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

const io = new Server(httpServer, {
  cors: {
    origin: clientURL,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('✅ Un utilisateur est connecté via WebSocket');
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());

const connectDB = async () => {
  try {
    // Pour les tests, on peut utiliser une base de données en mémoire ou ignorer la connexion
    if (process.env.NODE_ENV === 'test' || !process.env.MONGO_URI) {
      console.log('⚠️ Mode test - Connexion MongoDB ignorée');
      return;
    }

    const mongoOptions = {
      maxPoolSize: 10, // Maintenir jusqu'à 10 connexions socket
      serverSelectionTimeoutMS: 5000, // Garder en attente 5s avant d'abandonner
      socketTimeoutMS: 45000, // Fermer les sockets après 45s d'inactivité
      bufferMaxEntries: 0, // Désactiver le buffering mongoose
      bufferCommands: false, // Désactiver le buffering mongoose
    };

    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log('✅ Connexion à MongoDB réussie !');
    
    // Gestion des événements de connexion
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB déconnecté');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnecté');
    });
    
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB :', error.message);
    console.log('⚠️ Continuation sans base de données pour les tests');
  }
};

connectDB();

// Définition des Routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/absences', absenceRoutes);

// Route de santé pour Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'API du restaurant en cours d\'exécution...',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware de gestion des erreurs avec logging
app.use(errorLogger);

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  logger.error('Erreur non gérée', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  if (err.message === 'Non autorisé par CORS') {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  
  res.status(500).json({
    error: isProduction ? 'Erreur interne du serveur' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt gracieux...');
  httpServer.close(() => {
    console.log('Serveur fermé');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT reçu, arrêt gracieux...');
  httpServer.close(() => {
    console.log('Serveur fermé');
    process.exit(0);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info('Serveur démarré', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsUrl: clientURL
  });
  
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS autorisé pour: ${clientURL}`);
});