import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Container, Paper, Typography, TextField, Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

function AbsencePage() {
  const { user } = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [absences, setAbsences] = useState([]);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '' });

  const fetchAbsences = async () => {
    if (user.role === 'admin') {
      const { data } = await api.get('/absences');
      setAbsences(data);
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

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Gestion des Absences</Typography>
      
      <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Déclarer une absence</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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
                    <TableHead><TableRow><TableCell>Employé</TableCell><TableCell>Du</TableCell><TableCell>Au</TableCell><TableCell>Motif</TableCell></TableRow></TableHead>
                    <TableBody>
                        {absences.map(abs => (
                            <TableRow key={abs._id}>
                                <TableCell>{abs.employeeId.username}</TableCell>
                                <TableCell>{new Date(abs.startDate).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell>{new Date(abs.endDate).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell>{abs.reason}</TableCell>
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