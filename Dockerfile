# Utiliser une image Node.js Alpine pour une image plus légère
FROM node:18-alpine

# Installation des dépendances système nécessaires
RUN apk add --no-cache bash

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier package.json et package-lock.json
COPY backend/package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier le reste des fichiers du backend
COPY backend/ ./

# Vérifier la structure des fichiers
RUN ls -la

# Copier et rendre le script de démarrage exécutable
COPY backend/start.sh ./
RUN chmod +x start.sh

# Exposer le port
EXPOSE 5000

# Démarrer l'application avec le script
CMD ["./start.sh"]