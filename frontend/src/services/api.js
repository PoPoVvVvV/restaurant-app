import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // L'URL de base de votre API
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;