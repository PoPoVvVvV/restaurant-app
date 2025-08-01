import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Container, Paper, Typography, TextField, Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

function AbsencePage() {
  const { user } = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [absences, setAbsences] = useState([]);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '' });

  const fetchAbsences = async () => {
    if (user.role === 'admin') {
      try {
        const { data } = await api.get('/absences');
        setAbsences(data);
      } catch (err) {
        showNotification("Impossible de charger l'historique des absences.", "error");
      }
    }
  };

  useEffect(() => {
    fetchAbsences();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/absences', formData);
      showNotification(data.message, 'success');
      setFormData({ startDate: '', endDate: '', reason: '' });
      fetchAbsences();
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

      {user.role === 'admin' && (
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
                                  {abs.status === 'En attente' && (
                                    <>
                                      <IconButton color="success" onClick={() => handleStatusUpdate(abs._id, 'Validée')}><CheckCircleIcon /></IconButton>
                                      <IconButton color="error" onClick={() => handleStatusUpdate(abs._id, 'Refusée')}><CancelIcon /></IconButton>
                                    </>
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