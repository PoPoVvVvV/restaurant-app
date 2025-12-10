# Étape de construction
FROM node:18-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de développement et de production
RUN npm ci --only=production

# Copier le code source
COPY . .

# Construire l'application
RUN npm run build

# Étape d'exécution
FROM node:18-alpine

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Créer un utilisateur non root pour la sécurité
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY --from=builder /app/package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier les fichiers construits depuis l'étape de construction
COPY --from=builder /app ./

# Changer les permissions
RUN chown -R appuser:appgroup /app

# Basculer vers l'utilisateur non root
USER appuser

# Exposer le port
EXPOSE 3000

# Démarrer l'application avec PM2 pour une meilleure gestion des processus
CMD ["node", "server.js"]

# Configuration de la santé de l'application
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1