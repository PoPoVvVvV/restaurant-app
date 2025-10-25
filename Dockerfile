# Utiliser une image Node.js officielle comme base
FROM node:18

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY backend/package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers du backend
COPY backend/ .

# Exposer le port sur lequel l'application s'exécute
EXPOSE 5000

# Démarrer l'application
CMD ["npm", "start"]