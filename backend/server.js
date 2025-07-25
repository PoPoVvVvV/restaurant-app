import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';

// Importer toutes vos routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import recipeRoutes from './routes/recipes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Remplacez l'URL ci-dessous par celle de votre site Vercel ou mettez la dans une variable d'environnement
const clientURL = process.env.CLIENT_URL || 'https://restaurant-app-coral-six.vercel.app';

const corsOptions = {
  origin: clientURL,
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
    await mongoose.connect(process.env.MONGO_URI);
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

app.get('/', (req, res) => {
  res.send('API du restaurant en cours d\'exécution...');
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));