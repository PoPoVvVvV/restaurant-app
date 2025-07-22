import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';

// Importer les fichiers de routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import recipeRoutes from './routes/recipes.js';

// Charger les variables d'environnement depuis le fichier .env
dotenv.config();

// Initialiser l'application Express
const app = express();

// --- Middleware ---
// Autorise les requêtes provenant d'autres origines (notre frontend React)
app.use(cors());
// Permet au serveur de comprendre et de traiter les données JSON envoyées dans les requêtes
app.use(express.json());

// --- Connexion à la base de données MongoDB ---
const connectDB = async () => {
  try {
    // Tente de se connecter en utilisant l'URI stockée dans les variables d'environnement
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connexion à MongoDB réussie !');
  } catch (error) {
    // Affiche l'erreur en cas d'échec et arrête le processus du serveur
    console.error('❌ Erreur de connexion à MongoDB :', error.message);
    process.exit(1);
  }
};

// Exécuter la fonction de connexion à la base de données
connectDB();

// --- Définition des Routes de l'API ---
// Toutes les routes définies dans `auth.js` seront préfixées par `/api/auth`
app.use('/api/auth', authRoutes);
// Toutes les routes définies dans `products.js` seront préfixées par `/api/products`
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);

// Route de test simple pour la racine de l'API
app.get('/', (req, res) => {
  res.send('API du restaurant en cours d\'exécution...');
});

// Définir le port d'écoute du serveur
const PORT = process.env.PORT || 5000;

// Démarrer le serveur et écouter les requêtes sur le port défini
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));