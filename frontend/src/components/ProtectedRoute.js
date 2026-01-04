import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useContext(AuthContext);

  // Afficher un loader pendant la vérification du token
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    // Si l'utilisateur n'est pas connecté, redirection vers la page de connexion
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    // Si la route est pour admin et que l'utilisateur ne l'est pas, redirection
    return <Navigate to="/ventes" />;
  }

  return children;
};

export default ProtectedRoute;