import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Switch, FormControlLabel, Select, MenuItem, TextField, Button, Box, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import AuthContext from '../context/AuthContext';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null);
  const [savingSalaryUserId, setSavingSalaryUserId] = useState(null);
  const [newCode, setNewCode] = useState('');
  const { showError, showSuccess, showWarning, confirm } = useNotification();
  const { user: currentUser } = useContext(AuthContext);

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
  }, [fetchUsers]);

  const updateUserField = (userId, patch) => {
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...patch } : u));
  };

  const generateInviteCode = async () => {
    try {
      const { data } = await api.post('/users/generate-code');
      setNewCode(data.invitationCode);
      showSuccess('Code invitation généré');
    } catch (error) {
      console.error('Erreur génération code invitation:', error);
      showError(error.response?.data?.message || 'Erreur lors de la génération du code');
    }
  };

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

  const handleGradeChange = async (userId, nextGrade) => {
    try {
      await api.put(`/users/${userId}/grade`, { grade: nextGrade });
      showSuccess('Grade mis à jour');
      fetchUsers();
    } catch (error) {
      console.error('Erreur mise à jour grade:', error);
      showError(error.response?.data?.message || 'Erreur lors de la mise à jour du grade');
      fetchUsers();
    }
  };

  const handleRoleChange = async (targetUser, nextRole) => {
    const targetId = targetUser?._id;
    if (!targetId) return;

    // Eviter de tenter un changement inutile
    if (targetUser.role === nextRole) return;

    const roleLabel = nextRole === 'admin' ? 'admin' : 'employé';
    const shouldProceed = await confirm(
      `Confirmez-vous le changement de rôle de ${targetUser.username} vers ${roleLabel} ?`,
      {
        title: 'Confirmer le changement de rôle',
        severity: 'warning',
        confirmText: 'Confirmer',
        cancelText: 'Annuler'
      }
    );
    if (!shouldProceed) return;

    try {
      setUpdatingRoleUserId(targetId);
      await api.put(`/users/${targetId}/role`, { role: nextRole });
      showSuccess(`Rôle mis à jour pour ${targetUser.username}`);
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rôle:', error);
      showError(error.response?.data?.message || 'Erreur lors de la mise à jour du rôle');
      fetchUsers(); // Pour resynchroniser l’affichage si besoin
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleSaveSalarySettings = async (user) => {
    const isHighLevel = user?.grade === 'Patron' || user?.grade === 'Co-Patronne';
    if (isHighLevel) {
      showWarning('Patron / Co-Patronne : salaire fixe à 20 000$ (non modifiable).');
      return;
    }
    try {
      setSavingSalaryUserId(user._id);
      const fixedSalary =
        user.fixedSalary === '' || user.fixedSalary === undefined
          ? null
          : (user.fixedSalary === null ? null : Number(user.fixedSalary));
      const maxSalary =
        user.maxSalary === '' || user.maxSalary === undefined
          ? null
          : (user.maxSalary === null ? null : Number(user.maxSalary));
      const salaryPercentageOfMargin =
        user.salaryPercentageOfMargin === '' || user.salaryPercentageOfMargin === undefined
          ? null
          : (user.salaryPercentageOfMargin === null ? null : Number(user.salaryPercentageOfMargin));

      const payload = {
        fixedSalary: (fixedSalary === null || Number.isFinite(fixedSalary)) ? fixedSalary : null,
        maxSalary: (maxSalary === null || Number.isFinite(maxSalary)) ? maxSalary : null,
        allowMaxSalaryExceed: Boolean(user.allowMaxSalaryExceed),
        // stocké en décimal côté backend (0.1 = 10%)
        salaryPercentageOfMargin: (salaryPercentageOfMargin === null || Number.isFinite(salaryPercentageOfMargin))
          ? salaryPercentageOfMargin
          : null
      };

      await api.put(`/users/${user._id}/salary-settings`, payload);
      showSuccess('Paramètres salaire enregistrés');
      fetchUsers();
    } catch (error) {
      console.error('Erreur paramètres salaire:', error);
      showError(error.response?.data?.message || "Erreur lors de l'enregistrement");
      fetchUsers();
    } finally {
      setSavingSalaryUserId(null);
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

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={generateInviteCode}>Générer Code Invitation</Button>
        {newCode && (
          <Typography fontFamily="monospace" sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            {newCode}
          </Typography>
        )}
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom d'utilisateur</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell align="right">Salaire fixe ($)</TableCell>
              <TableCell align="right">Salaire max ($)</TableCell>
              <TableCell align="center">Dépassement</TableCell>
              <TableCell align="right">% sur marge</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={user.role || 'employe'}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                    disabled={
                      updatingRoleUserId === user._id ||
                      (currentUser?.id && String(currentUser.id) === String(user._id))
                    }
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="employe">Employé</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={user.grade || 'Novice'}
                    onChange={(e) => handleGradeChange(user._id, e.target.value)}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="Novice">Novice</MenuItem>
                    <MenuItem value="Confirmé">Confirmé</MenuItem>
                    <MenuItem value="Expérimenté">Expérimenté</MenuItem>
                    <MenuItem value="Manageur">Manageur</MenuItem>
                    <MenuItem value="Co-Patronne">Co-Patronne</MenuItem>
                    <MenuItem value="Patron">Patron</MenuItem>
                  </Select>
                </TableCell>
                <TableCell align="right">
                  {(() => {
                    const isHighLevel = user.grade === 'Patron' || user.grade === 'Co-Patronne';
                    if (isHighLevel) {
                      return (
                        <TextField
                          size="small"
                          type="number"
                          value="20000"
                          disabled
                          sx={{ maxWidth: 140 }}
                          variant="standard"
                        />
                      );
                    }
                    return (
                      <TextField
                        size="small"
                        type="number"
                        value={(user.fixedSalary === null || user.fixedSalary === undefined) ? '' : String(user.fixedSalary)}
                        onChange={(e) => updateUserField(user._id, { fixedSalary: e.target.value === '' ? null : Number(e.target.value) })}
                        inputProps={{ min: 0 }}
                        sx={{ maxWidth: 140 }}
                        variant="standard"
                      />
                    );
                  })()}
                </TableCell>
                <TableCell align="right">
                  {(() => {
                    const isHighLevel = user.grade === 'Patron' || user.grade === 'Co-Patronne';
                    if (isHighLevel) {
                      return (
                        <TextField
                          size="small"
                          type="number"
                          value="20000"
                          disabled
                          sx={{ maxWidth: 140 }}
                          variant="standard"
                        />
                      );
                    }
                    return (
                  <TextField
                    size="small"
                    type="number"
                    value={(user.maxSalary === null || user.maxSalary === undefined) ? '' : String(user.maxSalary)}
                    onChange={(e) => updateUserField(user._id, { maxSalary: e.target.value === '' ? null : Number(e.target.value) })}
                    inputProps={{ min: 0 }}
                    sx={{ maxWidth: 140 }}
                    variant="standard"
                  />
                    );
                  })()}
                </TableCell>
                <TableCell align="center">
                  {(() => {
                    const isHighLevel = user.grade === 'Patron' || user.grade === 'Co-Patronne';
                    return (
                      <Switch
                        checked={Boolean(user.allowMaxSalaryExceed)}
                        onChange={(e) => updateUserField(user._id, { allowMaxSalaryExceed: e.target.checked })}
                        size="small"
                        disabled={isHighLevel}
                      />
                    );
                  })()}
                </TableCell>
                <TableCell align="right">
                  {(() => {
                    const isHighLevel = user.grade === 'Patron' || user.grade === 'Co-Patronne';
                    if (isHighLevel) {
                      return (
                        <TextField
                          size="small"
                          value="—"
                          disabled
                          sx={{ maxWidth: 110 }}
                          variant="standard"
                        />
                      );
                    }
                    return (
                      <TextField
                        size="small"
                        type="number"
                        value={(user.salaryPercentageOfMargin === null || user.salaryPercentageOfMargin === undefined)
                          ? '50'
                          : String(Number(user.salaryPercentageOfMargin) * 100)
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') return updateUserField(user._id, { salaryPercentageOfMargin: null });
                          const asNumber = Number(v);
                          updateUserField(user._id, {
                            salaryPercentageOfMargin: Number.isFinite(asNumber) ? (asNumber / 100) : null
                          });
                        }}
                        inputProps={{ min: 0, max: 100, step: 0.1 }}
                        sx={{ maxWidth: 110 }}
                        variant="standard"
                      />
                    );
                  })()}
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
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={user.isActive ? 'Actif' : 'Désactivé'}
                      color={user.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  {(() => {
                    const isHighLevel = user.grade === 'Patron' || user.grade === 'Co-Patronne';
                    if (isHighLevel) {
                      return (
                        <Chip
                          label="Salaire fixe 20 000$"
                          color="info"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      );
                    }
                    return null;
                  })()}
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                    disabled={savingSalaryUserId === user._id}
                    onClick={() => handleSaveSalarySettings(user)}
                  >
                    Enregistrer
                  </Button>
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
