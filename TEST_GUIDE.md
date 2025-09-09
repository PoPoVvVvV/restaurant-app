# Guide de Test - Restaurant App Optimisé

## 🚀 Prérequis

### 1. Installation de Node.js
```bash
# Vérifier l'installation
node --version  # Doit afficher v18+ ou v20+
npm --version   # Doit afficher v8+ ou v9+
```

### 2. Installation de MongoDB
- MongoDB local ou MongoDB Atlas
- URL de connexion dans les variables d'environnement

## 📦 Installation des Dépendances

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## ⚙️ Configuration

### 1. Variables d'environnement Backend
Copier `backend/env.example` vers `backend/.env` et configurer :

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/restaurant-app
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
BCRYPT_ROUNDS=12
```

### 2. Variables d'environnement Frontend
Créer `frontend/.env` :

```env
REACT_APP_API_URL=http://localhost:5000
```

## 🧪 Tests Backend

### 1. Démarrer le serveur
```bash
cd backend
npm start
```

### 2. Tests de l'API
```bash
# Test de santé
curl http://localhost:5000/health

# Test de l'API racine
curl http://localhost:5000/

# Test des routes (après authentification)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### 3. Vérifications des optimisations
- ✅ Compression Gzip activée
- ✅ Rate limiting fonctionnel
- ✅ CORS configuré
- ✅ Monitoring des performances
- ✅ Cache en mémoire
- ✅ Logs structurés

## 🎨 Tests Frontend

### 1. Démarrer l'application
```bash
cd frontend
npm start
```

### 2. Tests de performance
- Ouvrir les DevTools (F12)
- Onglet Network : vérifier la compression
- Onglet Performance : mesurer les Core Web Vitals
- Onglet Application : vérifier le Service Worker

### 3. Tests fonctionnels
- ✅ Lazy loading des pages
- ✅ Service Worker enregistré
- ✅ Cache des ressources
- ✅ Gestion d'erreurs
- ✅ Responsive design

## 📊 Tests de Performance

### 1. Backend (Railway)
```bash
# Test de charge simple
for i in {1..10}; do
  curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/health
done
```

### 2. Frontend (Vercel)
- Lighthouse audit
- Core Web Vitals
- Bundle analyzer

## 🔍 Vérifications des Optimisations

### Backend
- [ ] Helmet.js : Headers de sécurité
- [ ] Compression : Réduction de la taille
- [ ] Rate limiting : Protection DDoS
- [ ] MongoDB : Connexions optimisées
- [ ] Cache : Mise en cache intelligente
- [ ] Logging : Logs structurés
- [ ] Monitoring : Métriques de performance

### Frontend
- [ ] Lazy loading : Chargement différé
- [ ] Service Worker : Cache offline
- [ ] SEO : Meta tags optimisés
- [ ] PWA : Manifest.json
- [ ] Performance : Core Web Vitals
- [ ] UX : Loading states

### Base de données
- [ ] Indexation : Requêtes optimisées
- [ ] Validation : Schémas Mongoose
- [ ] Aggregation : Pipelines efficaces
- [ ] Pagination : Limitation des résultats

## 🚨 Tests d'Erreur

### 1. Tests de résilience
- Arrêt de MongoDB
- Perte de connexion réseau
- Requêtes malformées
- Dépassement de limites

### 2. Tests de sécurité
- Tentatives d'injection
- Requêtes CORS non autorisées
- Rate limiting
- Validation des données

## 📈 Métriques Attendues

### Backend
- Temps de réponse : < 200ms
- Mémoire utilisée : < 100MB
- Throughput : 100+ req/min
- Uptime : 99.9%

### Frontend
- First Contentful Paint : < 1.5s
- Largest Contentful Paint : < 2.5s
- Cumulative Layout Shift : < 0.1
- Time to Interactive : < 3s

## 🐛 Dépannage

### Problèmes courants
1. **Port déjà utilisé** : Changer le port dans .env
2. **MongoDB non connecté** : Vérifier MONGO_URI
3. **CORS errors** : Vérifier CLIENT_URL
4. **Cache issues** : Nettoyer le cache du navigateur

### Logs utiles
```bash
# Backend
tail -f backend/logs/app.log

# Frontend
# Vérifier la console du navigateur
```

## ✅ Checklist de Validation

### Installation
- [ ] Node.js installé
- [ ] Dépendances installées
- [ ] Variables d'environnement configurées
- [ ] MongoDB accessible

### Backend
- [ ] Serveur démarre sans erreur
- [ ] API répond correctement
- [ ] Optimisations actives
- [ ] Monitoring fonctionnel

### Frontend
- [ ] Application se charge
- [ ] Service Worker actif
- [ ] Performance optimale
- [ ] UX fluide

### Intégration
- [ ] Communication backend-frontend
- [ ] Authentification fonctionnelle
- [ ] Cache synchronisé
- [ ] Erreurs gérées

---

*Guide de test pour Restaurant App v1.0.0 optimisé*

