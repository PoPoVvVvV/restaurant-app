import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Container, Paper, Typography, TextField, Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArchiveIcon from '@mui/icons-material/Archive';

function AbsencePage() {
  const { user } = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [absences, setAbsences] = useState([]);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '' });

  // --- DÉBUT DU DÉBOGAGE ---
  console.log("1. L'objet 'user' du contexte est :", user);
  // --- FIN DU DÉBOGAGE ---

  const fetchAbsences = useCallback(async () => {
    try {
      console.log("3. Appel de l'API pour récupérer les absences...");
      const { data } = await api.get('/absences');
      console.log("4. Données reçues du serveur :", data);
      setAbsences(data);
    } catch (err) {
      showNotification("Impossible de charger l'historique des absences.", "error");
    }
  }, [showNotification]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      console.log("2. L'utilisateur est un admin, déclenchement de fetchAbsences.");
      fetchAbsences();
    } else {
      console.log("2. Condition non remplie (utilisateur non admin ou non défini).");
    }
  }, [user, fetchAbsences]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // On récupère la nouvelle absence depuis la réponse de l'API
      const { data } = await api.post('/absences', formData);
      showNotification(data.message, 'success');
      setFormData({ startDate: '', endDate: '', reason: '' });
      
      // On ajoute manuellement la nouvelle absence à la liste existante
      if (user && user.role === 'admin') {
        setAbsences(prevAbsences => [data.absence, ...prevAbsences]);
      }

    } catch (err) {
      showNotification('Erreur lors de la déclaration.', 'error');
    }
  };
  
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/absences/${id}/status`, { status: newStatus });
      fetchAbsences();
      showNotification("Statut de l'absence mis à jour.", "success");
    } catch (err) {
      showNotification("Erreur lors de la mise à jour.", "error");
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.put(`/absences/${id}/archive`);
      fetchAbsences();
      showNotification("Absence archivée.", "info");
    } catch (err) {
      showNotification("Erreur lors de l'archivage.", "error");
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Gestion des Absences</Typography>
      
      <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Déclarer une absence</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <TextField name="startDate" label="Début de l'absence" type="date" value={formData.startDate} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
          <TextField name="endDate" label="Fin de l'absence" type="date" value={formData.endDate} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
        </Box>
        <TextField name="reason" label="Motif" value={formData.reason} onChange={handleChange} fullWidth margin="normal" required />
        <Button type="submit" variant="contained">Déclarer</Button>
      </Paper>

      {user && user.role === 'admin' && (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6">Historique des Absences</Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead><TableRow><TableCell>Employé</TableCell><TableCell>Du</TableCell><TableCell>Au</TableCell><TableCell>Motif</TableCell><TableCell>Statut</TableCell><TableCell align="center">Actions</TableCell></TableRow></TableHead>
                    <TableBody>
                        {absences.map(abs => (
                            <TableRow key={abs._id}>
                                <TableCell>{abs.employeeId?.username || 'N/A'}</TableCell>
                                <TableCell>{new Date(abs.startDate).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell>{new Date(abs.endDate).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell>{abs.reason}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={abs.status} 
                                        color={abs.status === 'Validée' ? 'success' : abs.status === 'Refusée' ? 'error' : 'warning'} 
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                  {abs.status === 'En attente' ? (
                                    <>
                                      <IconButton color="success" onClick={() => handleStatusUpdate(abs._id, 'Validée')}><CheckCircleIcon /></IconButton>
                                      <IconButton color="error" onClick={() => handleStatusUpdate(abs._id, 'Refusée')}><CancelIcon /></IconButton>
                                    </>
                                  ) : (
                                    <IconButton onClick={() => handleArchive(abs._id)} color="primary" size="small">
                                      <ArchiveIcon />
                                    </IconButton>
                                  )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
      )}
    </Container>
  );
}

export default AbsencePage;