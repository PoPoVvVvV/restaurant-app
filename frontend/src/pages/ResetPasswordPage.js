import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Container, Paper, Typography, TextField, Button, Box } from '@mui/material';
import api from '../services/api';

function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      showNotification(res.data, 'success');
    } catch (err) {
      showNotification(err.response?.data || 'Erreur', 'error');
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Réinitialiser le Mot de Passe</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField label="Token fourni par l'admin" value={token} onChange={e => setToken(e.target.value)} fullWidth margin="normal" />
          <TextField label="Nouveau mot de passe" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} fullWidth margin="normal" />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>Changer le mot de passe</Button>
        </Box>
      </Paper>
    </Container>
  );
}
export default ResetPasswordPage;