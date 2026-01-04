import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api'; // Importer notre instance axios

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Initialiser le token depuis le localStorage est la première étape clé
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['x-auth-token'];
  }, []);

  // Vérifier le token au chargement initial
  useEffect(() => {
    setLoading(true);
    
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decodedToken = jwtDecode(storedToken);
        
        // Vérifier si le token est expiré
        if (decodedToken.exp * 1000 < Date.now()) {
          logout();
        } else {
          // Si le token est valide, on met à jour l'état et les headers axios
          setUser(decodedToken.user);
          setToken(storedToken);
          api.defaults.headers.common['x-auth-token'] = storedToken;
        }
      } catch (error) {
        // Si le token est invalide
        console.error('Erreur de décodage du token:', error);
        logout();
      }
    } else {
      // Pas de token, utilisateur non connecté
      setUser(null);
      setToken(null);
    }
    
    setLoading(false);
  }, [logout]); // Seulement au montage initial

  const login = useCallback((newToken) => {
    try {
      // Décoder immédiatement pour vérifier que le token est valide
      const decodedToken = jwtDecode(newToken);
      
      // Vérifier si le token est expiré
      if (decodedToken.exp * 1000 < Date.now()) {
        console.error('Token expiré');
        return;
      }
      
      // Mettre à jour immédiatement l'utilisateur et le token
      setUser(decodedToken.user);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      api.defaults.headers.common['x-auth-token'] = newToken;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      logout();
    }
  }, [logout]);

  const contextValue = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  // Toujours rendre le provider, même pendant le chargement
  // Les composants enfants gèrent eux-mêmes l'état de chargement
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;