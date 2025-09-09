import fs from 'fs';
import path from 'path';

// Configuration du logging
const LOG_DIR = 'logs';
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Créer le dossier logs s'il n'existe pas
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Fonction pour formater les logs
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  return JSON.stringify(logEntry) + '\n';
};

// Fonction pour écrire dans le fichier de log
const writeLog = (level, message, meta = {}) => {
  const logEntry = formatLog(level, message, meta);
  
  // Écrire dans le fichier
  fs.appendFileSync(LOG_FILE, logEntry);
  
  // Afficher dans la console en développement
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${level.toUpperCase()}] ${message}`, meta);
  }
};

// Middleware de logging des requêtes
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log de la requête entrante
  writeLog('info', 'Requête reçue', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Intercepter la réponse
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log de la réponse
    writeLog('info', 'Réponse envoyée', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware de gestion des erreurs
export const errorLogger = (err, req, res, next) => {
  writeLog('error', 'Erreur capturée', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(err);
};

// Fonctions de logging utilitaires
export const logger = {
  info: (message, meta = {}) => writeLog('info', message, meta),
  warn: (message, meta = {}) => writeLog('warn', message, meta),
  error: (message, meta = {}) => writeLog('error', message, meta),
  debug: (message, meta = {}) => writeLog('debug', message, meta)
};

// Middleware de monitoring des performances
export const performanceMonitor = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1e6;
    
    // Log des performances
    writeLog('info', 'Performance de requête', {
      method: req.method,
      url: req.url,
      duration: `${duration.toFixed(2)}ms`,
      statusCode: res.statusCode,
      memoryUsage: process.memoryUsage()
    });
    
    // Alerte si la requête est trop lente
    if (duration > 5000) { // 5 secondes
      writeLog('warn', 'Requête lente détectée', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  });
  
  next();
};

// Monitoring de la mémoire
export const memoryMonitor = () => {
  const memoryUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };
  
  writeLog('info', 'Utilisation mémoire', memoryMB);
  
  // Alerte si l'utilisation mémoire est élevée
  if (memoryMB.heapUsed > 100) { // 100MB
    writeLog('warn', 'Utilisation mémoire élevée', memoryMB);
  }
};

// Démarrer le monitoring de la mémoire toutes les 5 minutes
setInterval(memoryMonitor, 5 * 60 * 1000);

