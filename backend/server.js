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
import christmasProductRoutes from './routes/christmasProducts.js';
import christmasTransactionRoutes from './routes/christmasTransactions.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Remplacez l'URL ci-dessous par celle de votre site Vercel ou mettez la dans une variable d'environnement
const clientURL = process.env.CLIENT_URL || 'https://restaurant-app-coral-six.vercel.app';

const corsOptions = {
  origin: clientURL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'authorization', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware CORS personnalisé pour gérer les requêtes pré-vol (preflight)
app.use((req, res, next) => {
  // Liste des en-têtes autorisés
  const allowedHeaders = [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'x-auth-token',
    'authorization',
    'Authorization'
  ];

  // Définir les en-têtes CORS
  res.header('Access-Control-Allow-Origin', clientURL);
  res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Répondre directement aux requêtes OPTIONS (pré-vol)
  if (req.method === 'OPTIONS') {
    // Ajouter l'en-tête Access-Control-Allow-Headers à la réponse OPTIONS
    res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    return res.status(200).end();
  }
  
  next();
});

// Utiliser le middleware CORS standard
app.use(cors(corsOptions));

// Compression des réponses pour améliorer les performances
app.use(compression());

// Limite de taille du body pour éviter les abus
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/christmas-products', christmasProductRoutes);
app.use('/api/christmas-transactions', christmasTransactionRoutes);

app.get('/', (req, res) => {
  res.send('API du restaurant en cours d\'exécution...');
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));