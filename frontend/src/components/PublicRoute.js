import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  // Affiche un écran vide pendant la vérification du token pour éviter un flash
  if (loading) {
    return null;
  }

  // Si l'utilisateur est connecté, on le redirige vers la page des ventes
  return isAuthenticated ? <Navigate to="/ventes" replace /> : children;
};

export default PublicRoute;