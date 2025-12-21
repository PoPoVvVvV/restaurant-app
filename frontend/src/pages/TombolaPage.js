import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Save as SaveIcon, Receipt as ReceiptIcon } from '@mui/icons-material';

// Fonction pour générer un code aléatoire de 12 caractères (lettres majuscules et chiffres)
const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const usedCodes = new Set(JSON.parse(localStorage.getItem('tombolaTickets') || '[]').map(t => t.code));
  
  do {
    result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (usedCodes.has(result));
  
  return result;
};

const TombolaPage = () => {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    ticketCount: 1,
  });
  
  const [tickets, setTickets] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Charger les tickets existants depuis le localStorage
  useEffect(() => {
    const savedTickets = JSON.parse(localStorage.getItem('tombolaTickets') || '[]');
    setTickets(savedTickets);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ticketCount' ? Math.max(1, parseInt(value) || 1) : value
    }));
  };

  const generateTickets = useCallback(() => {
    if (!formData.lastName || !formData.firstName || !formData.phone) {
      showSnackbar('Veuillez remplir tous les champs', 'error');
      return [];
    }

    const newTickets = [];
    for (let i = 0; i < formData.ticketCount; i++) {
      newTickets.push({
        id: Date.now() + i,
        code: generateRandomCode(),
        lastName: formData.lastName,
        firstName: formData.firstName,
        phone: formData.phone,
        date: new Date().toISOString(),
        price: 250 // Prix par ticket
      });
    }
    return newTickets;
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newTickets = generateTickets();
    if (newTickets.length === 0) return;
    
    const updatedTickets = [...tickets, ...newTickets];
    setTickets(updatedTickets);
    localStorage.setItem('tombolaTickets', JSON.stringify(updatedTickets));
    
    showSnackbar(`${newTickets.length} ticket(s) généré(s) avec succès !`, 'success');
    
    // Réinitialiser le formulaire
    setFormData({
      lastName: formData.lastName,
      firstName: formData.firstName,
      phone: formData.phone,
      ticketCount: 1,
    });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const calculateTotal = () => {
    return tickets.reduce((total, ticket) => total + ticket.price, 0);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Tombola
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Acheter des tickets
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Nom"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="Prénom"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="Téléphone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="Nombre de tickets"
              name="ticketCount"
              type="number"
              value={formData.ticketCount}
              onChange={handleChange}
              inputProps={{ min: 1 }}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<ReceiptIcon />}
              size="large"
            >
              Générer les tickets ({formData.ticketCount * 250} $)
            </Button>
          </Box>
        </Box>
      </Paper>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Récapitulatif</Typography>
            <Typography variant="h6">
              Total: <strong>{calculateTotal()} $</strong> ({tickets.length} tickets)
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
          {tickets.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Prénom</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell align="right">Prix</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Box component="code" sx={{ fontFamily: 'monospace' }}>
                          {ticket.code}
                        </Box>
                      </TableCell>
                      <TableCell>{ticket.lastName}</TableCell>
                      <TableCell>{ticket.firstName}</TableCell>
                      <TableCell>{ticket.phone}</TableCell>
                      <TableCell align="right">{ticket.price} $</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Aucun ticket généré pour le moment
            </Typography>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TombolaPage;
