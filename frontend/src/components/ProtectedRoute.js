import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useContext(AuthContext);

  // Afficher un indicateur de chargement pendant la vérification de l'authentification
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Si l'utilisateur n'est pas connecté, redirection vers la page de connexion
  if (!user) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} />;
  }

  // Si la route est pour admin et que l'utilisateur ne l'est pas, redirection
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/ventes" replace />;
  }

  return children;
};

export default React.memo(ProtectedRoute);