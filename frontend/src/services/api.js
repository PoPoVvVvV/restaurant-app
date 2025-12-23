import axios from 'axios';

const api = axios.create({
  baseURL: 'https://restaurant-app-production-61c2.up.railway.app', // URL de base de l'API
  withCredentials: true, // Important pour les cookies d'authentification
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
    config.headers['Authorization'] = `Bearer ${token}`; // Ajout d'un en-tête Authorization standard
  }
  
  // Pour le débogage
  console.log('Envoi de la requête vers:', config.url);
  console.log('En-têtes de la requête:', config.headers);
  
  return config;
}, error => {
  console.error('Erreur dans l\'intercepteur de requête:', error);
  return Promise.reject(error);
});

// Intercepteur de réponse pour le débogage
api.interceptors.response.use(
  response => {
    console.log('Réponse reçue:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('Erreur de réponse:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      } : 'Pas de réponse du serveur'
    });
    return Promise.reject(error);
  }
);

export default api;