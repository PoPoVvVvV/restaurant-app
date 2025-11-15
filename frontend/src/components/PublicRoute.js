import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import AuthContext from '../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  // Affiche un indicateur de chargement pendant la vérification du token
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>Chargement...</Typography>
      </Box>
    );
  }

  // Si l'utilisateur est connecté, on le redirige vers la page des ventes
  return isAuthenticated ? <Navigate to="/ventes" /> : children;
};

export default PublicRoute;