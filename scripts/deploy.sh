#!/bin/bash

# Script de déploiement optimisé pour Railway et Vercel

echo "🚀 Démarrage du déploiement..."

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
    log_error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Fonction pour déployer le backend sur Railway
deploy_backend() {
    log_info "Déploiement du backend sur Railway..."
    
    cd backend
    
    # Vérifier si les dépendances sont installées
    if [ ! -d "node_modules" ]; then
        log_info "Installation des dépendances backend..."
        npm install
    fi
    
    # Vérifier les variables d'environnement
    if [ ! -f ".env" ]; then
        log_warn "Fichier .env manquant, copie de env.example..."
        cp env.example .env
        log_warn "N'oubliez pas de configurer vos variables d'environnement !"
    fi
    
    # Linter (si disponible)
    if npm run lint > /dev/null 2>&1; then
        log_info "Vérification du code backend..."
        npm run lint
    fi
    
    cd ..
    log_info "Backend prêt pour le déploiement sur Railway"
}

# Fonction pour déployer le frontend sur Vercel
deploy_frontend() {
    log_info "Déploiement du frontend sur Vercel..."
    
    cd frontend
    
    # Vérifier si les dépendances sont installées
    if [ ! -d "node_modules" ]; then
        log_info "Installation des dépendances frontend..."
        npm install
    fi
    
    # Build de production
    log_info "Construction de l'application frontend..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log_info "Build frontend réussi !"
    else
        log_error "Échec du build frontend"
        exit 1
    fi
    
    cd ..
    log_info "Frontend prêt pour le déploiement sur Vercel"
}

# Fonction pour vérifier la configuration
check_config() {
    log_info "Vérification de la configuration..."
    
    # Vérifier vercel.json
    if [ ! -f "vercel.json" ]; then
        log_warn "Fichier vercel.json manquant"
    fi
    
    # Vérifier railway.json
    if [ ! -f "backend/railway.json" ]; then
        log_warn "Fichier backend/railway.json manquant"
    fi
    
    # Vérifier les variables d'environnement
    if [ ! -f "backend/.env" ] && [ ! -f "backend/env.example" ]; then
        log_warn "Aucun fichier d'environnement trouvé pour le backend"
    fi
}

# Fonction pour nettoyer les caches
cleanup() {
    log_info "Nettoyage des caches..."
    
    # Nettoyer les node_modules
    if [ -d "backend/node_modules" ]; then
        rm -rf backend/node_modules
    fi
    
    if [ -d "frontend/node_modules" ]; then
        rm -rf frontend/node_modules
    fi
    
    # Nettoyer les builds
    if [ -d "frontend/build" ]; then
        rm -rf frontend/build
    fi
    
    log_info "Nettoyage terminé"
}

# Fonction pour afficher l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --backend     Déployer seulement le backend"
    echo "  --frontend    Déployer seulement le frontend"
    echo "  --all         Déployer backend et frontend (défaut)"
    echo "  --check       Vérifier la configuration seulement"
    echo "  --clean       Nettoyer les caches et rebuilds"
    echo "  --help        Afficher cette aide"
    echo ""
}

# Traitement des arguments
case "${1:-all}" in
    --backend)
        check_config
        deploy_backend
        ;;
    --frontend)
        check_config
        deploy_frontend
        ;;
    --all|all)
        check_config
        deploy_backend
        deploy_frontend
        ;;
    --check)
        check_config
        ;;
    --clean)
        cleanup
        ;;
    --help)
        show_help
        ;;
    *)
        log_error "Option inconnue: $1"
        show_help
        exit 1
        ;;
esac

log_info "✅ Déploiement terminé avec succès !"

