import cacheService from '../services/cache.js';

// Middleware de cache générique
export const cache = (ttl = 300000, keyGenerator = null) => {
  return (req, res, next) => {
    // Générer la clé de cache
    let cacheKey;
    
    if (keyGenerator && typeof keyGenerator === 'function') {
      cacheKey = keyGenerator(req);
    } else {
      // Clé par défaut basée sur l'URL et les paramètres
      const url = req.originalUrl || req.url;
      const params = JSON.stringify(req.query);
      cacheKey = `route:${req.method}:${url}:${params}`;
    }

    // Vérifier si la réponse est en cache
    const cachedResponse = cacheService.get(cacheKey);
    
    if (cachedResponse) {
      console.log(`📦 Cache hit pour: ${cacheKey}`);
      return res.json(cachedResponse);
    }

    // Intercepter la réponse pour la mettre en cache
    const originalJson = res.json;
    res.json = function(data) {
      // Mettre en cache seulement les réponses réussies
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(cacheKey, data, ttl);
        console.log(`💾 Réponse mise en cache: ${cacheKey}`);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware de cache spécialisé pour les utilisateurs
export const cacheUser = (req, res, next) => {
  const userId = req.params.id || req.user?.id;
  
  if (!userId) {
    return next();
  }

  const cacheKey = `user:${userId}`;
  const cachedUser = cacheService.getCachedUser(userId);
  
  if (cachedUser) {
    console.log(`👤 Utilisateur en cache: ${userId}`);
    return res.json(cachedUser);
  }

  // Intercepter la réponse
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cacheService.cacheUser(userId, data);
    }
    return originalJson.call(this, data);
  };

  next();
};

// Middleware de cache pour les transactions
export const cacheTransactions = (req, res, next) => {
  const weekId = req.query.weekId || req.params.weekId;
  
  if (!weekId) {
    return next();
  }

  const cachedTransactions = cacheService.getCachedTransactions(weekId);
  
  if (cachedTransactions) {
    console.log(`💰 Transactions en cache pour la semaine: ${weekId}`);
    return res.json(cachedTransactions);
  }

  // Intercepter la réponse
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cacheService.cacheTransactions(weekId, data);
    }
    return originalJson.call(this, data);
  };

  next();
};

// Middleware de cache pour les produits
export const cacheProducts = (req, res, next) => {
  const cachedProducts = cacheService.getCachedProducts();
  
  if (cachedProducts) {
    console.log('📦 Produits en cache');
    return res.json(cachedProducts);
  }

  // Intercepter la réponse
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cacheService.cacheProducts(data);
    }
    return originalJson.call(this, data);
  };

  next();
};

// Middleware de cache pour les rapports
export const cacheReports = (req, res, next) => {
  const reportType = req.params.type || req.query.type;
  const params = { ...req.query, ...req.params };
  
  if (!reportType) {
    return next();
  }

  const cachedReport = cacheService.getCachedReports(reportType, params);
  
  if (cachedReport) {
    console.log(`📊 Rapport en cache: ${reportType}`);
    return res.json(cachedReport);
  }

  // Intercepter la réponse
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cacheService.cacheReports(reportType, params, data);
    }
    return originalJson.call(this, data);
  };

  next();
};

// Middleware pour invalider le cache après modification
export const invalidateCache = (patterns = []) => {
  return (req, res, next) => {
    // Intercepter la réponse pour invalider le cache après modification
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          const deletedCount = cacheService.deletePattern(pattern);
          if (deletedCount > 0) {
            console.log(`🗑️ Cache invalidé: ${deletedCount} éléments supprimés (pattern: ${pattern})`);
          }
        });
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware pour invalider le cache des utilisateurs
export const invalidateUserCache = invalidateCache(['user:']);

// Middleware pour invalider le cache des transactions
export const invalidateTransactionCache = invalidateCache(['transactions:', 'reports:']);

// Middleware pour invalider le cache des produits
export const invalidateProductCache = invalidateCache(['products:']);

// Middleware pour invalider tout le cache
export const invalidateAllCache = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cacheService.clear();
      console.log('🗑️ Tout le cache a été invalidé');
    }
    return originalJson.call(this, data);
  };

  next();
};

