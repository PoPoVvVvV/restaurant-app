import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
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

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        
        // Vérifier si le token est expiré
        if (decodedToken.exp * 1000 < Date.now()) {
          logout();
        } else {
          // Si le token est valide, on met à jour l'état et les headers axios
          setUser(decodedToken.user);
          api.defaults.headers.common['x-auth-token'] = token;
        }
      } catch (error) {
        // Si le token est invalide
        logout();
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [token, logout]);

  const login = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }, []);

  const contextValue = useMemo(() => ({
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  }), [user, token, login, logout]);

  // On n'affiche l'application que lorsque la vérification du token est terminée
  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;