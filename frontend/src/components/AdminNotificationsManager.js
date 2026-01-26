import React, { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export default function AdminNotificationsManager() {
  const { showNotification } = useNotification();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePublish = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      showNotification('Veuillez saisir un message.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.post('/notifications', { title: title.trim(), message: trimmed });
      setTitle('');
      setMessage('');
      showNotification('Notification envoyée !', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || "Erreur lors de l'envoi.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Notifications (pour tous les utilisateurs)
      </Typography>
      <Box component="form" onSubmit={handlePublish} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Titre (optionnel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
        />
        <TextField
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          minRows={3}
          required
        />
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            type="button"
            onClick={() => {
              setTitle('');
              setMessage('');
            }}
            disabled={saving}
          >
            Effacer
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Envoi...' : 'Publier'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

