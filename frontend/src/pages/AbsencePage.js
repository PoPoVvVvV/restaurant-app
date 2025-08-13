import React, 'react';
import { Container, Paper, Typography, TextField, Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArchiveIcon from '@mui/icons-material/Archive';

function AbsencePage() {
  const [absences, setAbsences] = React.useState([]);
  const [formData, setFormData] = React.useState({ startDate: '', endDate: '', reason: '' });
  
  // Remplacer par votre logique de fetch et de notification
  const { user } = { user: { role: 'admin' } }; // Simule un admin pour la démo
  const showNotification = (message, type) => alert(message);

  const fetchAbsences = () => {
    // Exemple : api.get('/absences').then(res => setAbsences(res.data));
    // Pour la démo :
    setAbsences([
        {_id: '1', employeeId: {username: 'Alice'}, startDate: new Date(), endDate: new Date(), reason: 'Maladie', status: 'En attente'},
        {_id: '2', employeeId: {username: 'Bob'}, startDate: new Date(), endDate: new Date(), reason: 'Personnel', status: 'Validée'},
    ]);
  };

  React.useEffect(() => {
    if(user.role === 'admin') fetchAbsences();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Exemple : await api.post('/absences', formData);
    showNotification('Absence déclarée !', 'success');
    fetchAbsences();
  };
  
  const handleStatusUpdate = (id, newStatus) => {
    // Exemple : await api.put(`/absences/${id}/status`, { status: newStatus });
    showNotification('Statut mis à jour !', 'success');
    fetchAbsences();
  };

  const handleArchive = (id) => {
    // Exemple : await api.put(`/absences/${id}/archive`);
    showNotification('Absence archivée.', 'info');
    fetchAbsences();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Gestion des Absences</Typography>
      
      <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Déclarer une absence</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <TextField name="startDate" label="Début" type="date" value={formData.startDate} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
          <TextField name="endDate" label="Fin" type="date" value={formData.endDate} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
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
                                <TableCell>{abs.employeeId.username}</TableCell>
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