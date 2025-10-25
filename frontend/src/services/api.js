import axios from 'axios';

const api = axios.create({
  baseURL: 'https://restaurant-app-production-61c2.up.railway.app/api', // L'URL de base de votre API
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

// Méthodes pour la gestion des utilisateurs inactifs
export const getInactiveUsers = async () => {
  try {
    const response = await api.get('/users/inactive');
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Une erreur est survenue';
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Une erreur est survenue';
  }
};

export default api;