import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';

function ExpenseNotePage() {
  const [expenseNotes, setExpenseNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    date: new Date().toISOString().split('T')[0],
    imageUrl: '',
    amount: '',
  });

  const fetchExpenseNotes = useCallback(async () => {
    try {
      const { data } = await api.get('/expense-notes/me');
      setExpenseNotes(data);
    } catch (err) {
      showNotification("Impossible de charger les notes de frais.", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchExpenseNotes();

    const handleDataUpdate = (data) => {
      if (data.type === 'EXPENSE_NOTES_UPDATED') {
        fetchExpenseNotes();
      }
    };

    socket.on('data-updated', handleDataUpdate);
    return () => {
      socket.off('data-updated', handleDataUpdate);
    };
  }, [fetchExpenseNotes]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.date || !formData.imageUrl || !formData.amount) {
      showNotification("Veuillez remplir tous les champs.", "error");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 0) {
      showNotification("Le montant doit être un nombre positif.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/expense-notes', formData);
      showNotification("Note de frais créée avec succès !", "success");
      setOpenDialog(false);
      setFormData({
        firstName: '',
        lastName: '',
        date: new Date().toISOString().split('T')[0],
        imageUrl: '',
        amount: '',
      });
    } catch (err) {
      showNotification(err.response?.data?.message || "Erreur lors de la création de la note de frais.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/expense-notes/${deleteDialog.id}`);
      showNotification("Note de frais supprimée.", "success");
      setDeleteDialog({ open: false, id: null });
    } catch (err) {
      showNotification(err.response?.data?.message || "Erreur lors de la suppression.", "error");
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'approved':
        return <Chip icon={<CheckCircleIcon />} label="Approuvée" color="success" size="small" />;
      case 'rejected':
        return <Chip icon={<CancelIcon />} label="Rejetée" color="error" size="small" />;
      default:
        return <Chip label="En attente" color="warning" size="small" />;
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Notes de Frais
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Nouvelle Note de Frais
        </Button>
      </Box>

      {expenseNotes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Aucune note de frais pour le moment.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cliquez sur "Nouvelle Note de Frais" pour en créer une.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nom / Prénom</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Montant</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Statut</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Image</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenseNotes.map((note) => (
                <TableRow key={note._id}>
                  <TableCell>
                    {note.firstName} {note.lastName}
                  </TableCell>
                  <TableCell>
                    {new Date(note.date).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      ${note.amount.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip(note.status)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<ImageIcon />}
                      href={note.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir l'image
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    {note.status === 'pending' && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteDialog({ open: true, id: note._id })}
                      >
                        Supprimer
                      </Button>
                    )}
                    {note.status === 'rejected' && note.rejectionReason && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        Raison: {note.rejectionReason}
                      </Alert>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog pour créer une nouvelle note de frais */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle Note de Frais</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prénom"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Lien de l'image"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  helperText="Collez le lien URL de l'image de votre note de frais"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Montant ($)"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  inputProps={{ min: 0, step: 0.01 }}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={24} /> : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer cette note de frais ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ExpenseNotePage;

