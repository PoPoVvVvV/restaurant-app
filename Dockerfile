# Utiliser une image Node.js LTS
FROM node:18-slim

# Définir le répertoire de travail
WORKDIR /app

# Copier d'abord les fichiers de dépendances
COPY backend/package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste des fichiers
COPY backend/ ./

# Exposer le port (pour la documentation, Railway l'ignore)
EXPOSE 5000

# Définir la commande de démarrage
CMD ["node", "server.js"]