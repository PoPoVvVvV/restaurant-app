import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useContext(AuthContext);

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