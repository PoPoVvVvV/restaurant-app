import React, { useState, useEffect } from 'react';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Switch, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  DialogContentText, FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useCallback } from 'react';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const { showNotification, showError, showSuccess, showWarning, confirm } = useNotification();

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      showError('Erreur lors du chargement des utilisateurs');
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId, isActive) => {
    try {
      await api.put(`/users/${userId}/status`, { isActive: !isActive });
      showSuccess(`Compte ${isActive ? 'désactivé' : 'activé'} avec succès`);
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      showError('Erreur lors de la mise à jour du statut');
    }
  };

  const confirmDeleteUser = async (user) => {
    if (user.isActive) {
      showWarning('Veuillez d\'abord désactiver le compte avant de le supprimer');
      return;
    }

    console.log('Tentative de suppression du compte:', user._id, user.username);
    
    try {
      const shouldDelete = await confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.username} ?`,
        {
          title: 'Confirmer la suppression',
          severity: 'error',
          confirmText: 'Supprimer',
          cancelText: 'Annuler'
        }
      );

      console.log('Confirmation de suppression:', shouldDelete);

      if (shouldDelete) {
        console.log('Envoi de la requête de suppression pour l\'utilisateur:', user._id);
        const response = await api.delete(`/users/${user._id}`);
        console.log('Réponse du serveur:', response);
        
        if (response.status === 200) {
          showSuccess('Compte supprimé avec succès');
          // Rafraîchir la liste des utilisateurs
          await fetchUsers();
        } else {
          throw new Error(`Erreur inattendue: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Erreur détaillée lors de la suppression du compte:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      showError(error.response?.data?.message || 'Erreur lors de la suppression du compte');
    }
  };


  if (loading) {
    return <div>Chargement des utilisateurs...</div>;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Gestion des Utilisateurs
      </Typography>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom d'utilisateur</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Box sx={{ 
                    display: 'inline-block',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: user.role === 'admin' ? 'primary.light' : 'grey.300',
                    color: user.role === 'admin' ? 'primary.contrastText' : 'text.primary',
                    fontWeight: 'medium',
                    fontSize: '0.75rem',
                    textTransform: 'capitalize'
                  }}>
                    {user.role}
                  </Box>
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={user.isActive}
                        onChange={() => handleStatusChange(user._id, user.isActive)}
                        color="primary"
                      />
                    }
                    label={user.isActive ? 'Actif' : 'Inactif'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={() => confirmDeleteUser(user)}
                    disabled={user.isActive}
                    color="error"
                    title={user.isActive ? 'Désactivez d\'abord le compte' : 'Supprimer le compte'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

    </Paper>
  );
};

export default UserManager;
