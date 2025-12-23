import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';

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
import easterEggScoreRoutes from './routes/easterEggScores.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Liste des origines autorisées
const allowedOrigins = [
  'https://restaurant-app-coral-six.vercel.app',
  'https://restaurant-app-production-61c2.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5000'
];

// Configuration CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permettre les requêtes sans origine (comme les applications mobiles ou Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-auth-token',
    'authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware CORS personnalisé pour gérer les requêtes pré-vol (preflight)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Répondre immédiatement aux requêtes OPTIONS (pré-vol)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Activer CORS avec les options configurées
app.use(cors(corsOptions));

// Gestion des erreurs CORS
app.use((err, req, res, next) => {
  if (err.name === 'CorsError') {
    console.error('Erreur CORS:', err.message);
    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé par la politique CORS'
    });
  }
  next(err);
});

// Compression des réponses pour améliorer les performances
app.use(compression());

// Limite de taille du body pour éviter les abus
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
  }
});

io.on('connection', (socket) => {
  console.log('✅ Un utilisateur est connecté via WebSocket');
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const connectDB = async () => {
  try {
    // Options de connexion optimisées
    const mongooseOptions = {
      maxPoolSize: 10, // Maintenir jusqu'à 10 connexions socket
      serverSelectionTimeoutMS: 5000, // Timeout après 5s au lieu de 30s
      socketTimeoutMS: 45000, // Fermer les sockets après 45s d'inactivité
    };
    
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log('✅ Connexion à MongoDB réussie !');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB :', error.message);
    process.exit(1);
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
app.use('/api/easter-egg-scores', easterEggScoreRoutes);

app.get('/', (req, res) => {
  res.send('API du restaurant en cours d\'exécution...');
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));