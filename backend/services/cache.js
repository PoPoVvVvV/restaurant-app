// Service de cache simple en mémoire (peut être remplacé par Redis en production)
class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300000; // 5 minutes par défaut
    this.cleanupInterval = 60000; // Nettoyage toutes les minutes
    
    // Démarrer le nettoyage automatique
    this.startCleanup();
  }

  // Générer une clé de cache
  generateKey(prefix, ...params) {
    return `${prefix}:${params.join(':')}`;
  }

  // Obtenir une valeur du cache
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Vérifier si l'élément a expiré
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  // Définir une valeur dans le cache
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
  }

  // Supprimer une valeur du cache
  delete(key) {
    return this.cache.delete(key);
  }

  // Supprimer toutes les clés correspondant à un pattern
  deletePattern(pattern) {
    const regex = new RegExp(pattern);
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Vider tout le cache
  clear() {
    this.cache.clear();
  }

  // Obtenir les statistiques du cache
  getStats() {
    const now = Date.now();
    let totalItems = 0;
    let expiredItems = 0;
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      totalItems++;
      totalSize += JSON.stringify(item).length;
      
      if (now > item.expiresAt) {
        expiredItems++;
      }
    }

    return {
      totalItems,
      expiredItems,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }

  // Nettoyage automatique des éléments expirés
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cache nettoyé: ${cleanedCount} éléments expirés supprimés`);
      }
    }, this.cleanupInterval);
  }

  // Méthodes spécialisées pour différents types de données
  cacheUser(userId, userData, ttl = 300000) {
    const key = this.generateKey('user', userId);
    this.set(key, userData, ttl);
  }

  getCachedUser(userId) {
    const key = this.generateKey('user', userId);
    return this.get(key);
  }

  cacheTransactions(weekId, transactions, ttl = 300000) {
    const key = this.generateKey('transactions', 'week', weekId);
    this.set(key, transactions, ttl);
  }

  getCachedTransactions(weekId) {
    const key = this.generateKey('transactions', 'week', weekId);
    return this.get(key);
  }

  cacheProducts(products, ttl = 600000) { // 10 minutes pour les produits
    const key = this.generateKey('products', 'all');
    this.set(key, products, ttl);
  }

  getCachedProducts() {
    const key = this.generateKey('products', 'all');
    return this.get(key);
  }

  cacheReports(reportType, params, data, ttl = 300000) {
    const key = this.generateKey('reports', reportType, ...Object.values(params));
    this.set(key, data, ttl);
  }

  getCachedReports(reportType, params) {
    const key = this.generateKey('reports', reportType, ...Object.values(params));
    return this.get(key);
  }

  // Invalider le cache pour un utilisateur
  invalidateUserCache(userId) {
    this.deletePattern(`user:${userId}`);
  }

  // Invalider le cache des transactions
  invalidateTransactionCache() {
    this.deletePattern('transactions:');
  }

  // Invalider le cache des produits
  invalidateProductCache() {
    this.deletePattern('products:');
  }

  // Invalider le cache des rapports
  invalidateReportCache() {
    this.deletePattern('reports:');
  }
}

// Instance singleton
const cacheService = new CacheService();

export default cacheService;

