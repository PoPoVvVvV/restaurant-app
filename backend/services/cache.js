import NodeCache from 'node-cache';

// Cache avec une durée de vie de 5 minutes par défaut
const cache = new NodeCache({ stdTTL: 300 });

export const cacheMiddleware = (key, ttl = 300) => async (req, res, next) => {
  try {
    const cachedData = cache.get(key);
    if (cachedData) {
      return res.json(cachedData);
    }
    // Stocker la fonction json d'origine
    const originalJson = res.json;
    // Remplacer par notre version qui met en cache
    res.json = (data) => {
      cache.set(key, data, ttl);
      return originalJson.call(res, data);
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const invalidateCache = (key) => {
  cache.del(key);
};

export default cache;