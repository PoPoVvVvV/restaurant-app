import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Box, CircularProgress, Typography } from '@mui/material';
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
    const checkAuth = async () => {
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          
          // Vérifier si le token est expiré
          if (decodedToken.exp * 1000 < Date.now()) {
            setUser(null);
            setToken(null);
            localStorage.removeItem('token');
            delete api.defaults.headers.common['x-auth-token'];
          } else {
            // Si le token est valide, on met à jour l'état et les headers axios
            setUser(decodedToken.user);
            api.defaults.headers.common['x-auth-token'] = token;
          }
        } catch (error) {
          // Si le token est invalide
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['x-auth-token'];
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

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
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>Chargement...</Typography>
        </Box>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;