import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar
} from '@mui/material';
import { EmojiEvents as PrizeIcon, Close as CloseIcon } from '@mui/icons-material';
import api from '../services/api';

const prizes = [
  { id: 1, name: '1er Prix', description: 'Grand Prix Principal' },
  { id: 2, name: '2ème Prix', description: 'Deuxième Prix' },
  { id: 3, name: '3ème Prix', description: 'Troisième Prix' }
];

const TombolaDraw = ({ tickets, onDrawComplete }) => {
  const [winners, setWinners] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [currentDraw, setCurrentDraw] = useState(null);
  const [availableTickets, setAvailableTickets] = useState([...tickets]);

  useEffect(() => {
    // Charger les gagnants existants depuis l'API
    const fetchWinners = async () => {
      try {
        const response = await api.get('/tombola/winners');
        if (response.data && response.data.success) {
          const winnersData = [
            response.data.winners.first,
            response.data.winners.second,
            response.data.winners.third
          ].filter(Boolean);
          
          setWinners(winnersData);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des gagnants:', error);
        setError('Impossible de charger les gagnants');
      }
    };

    fetchWinners();
  }, []);

  useEffect(() => {
    // Mettre à jour les tickets disponibles quand la liste des tickets change
    setAvailableTickets([...tickets]);
  }, [tickets]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleDraw = () => {
    const nextPrize = prizes[winners.length];
    if (!nextPrize) return;

    setCurrentDraw(nextPrize);
    setOpenConfirm(true);
  };

  const confirmDraw = async () => {
    setOpenConfirm(false);
    setIsDrawing(true);
    setError(null);

    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    if (!token) {
      const errorMsg = 'Aucun token d\'authentification trouvé. Veuillez vous reconnecter.';
      console.error(errorMsg);
      setError(errorMsg);
      showSnackbar('Veuillez vous reconnecter', 'error');
      setIsDrawing(false);
      return;
    }

    try {
      console.log('Tentative de tirage avec le token:', token.substring(0, 10) + '...');
      
      // Appel à l'API pour effectuer le tirage
      console.log('Envoi de la requête de tirage...');
      const response = await api.post('/tombola/draw', {}, {
        headers: {
          'x-auth-token': token,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Réponse du serveur:', response.data);
      
      if (!response.data) {
        throw new Error('Aucune donnée reçue du serveur');
      }
      
      if (response.data.success) {
        const { winners } = response.data;
        
        if (!winners) {
          throw new Error('Aucun gagnant trouvé dans la réponse du serveur');
        }
        
        // Filtrer les gagnants nuls et créer un tableau ordonné
        const newWinners = [
          winners.first,
          winners.second,
          winners.third
        ].filter(winner => winner !== null && winner !== undefined);
        
        console.log('Gagnants du tirage:', newWinners);
        setWinners(newWinners);
        
        // Afficher un message de succès avec le nombre de gagnants
        const winnerCount = newWinners.length;
        const prizeText = winnerCount > 1 ? 'gagnants ont été tirés' : 'gagnant a été tiré';
        showSnackbar(`Le tirage a réussi ! ${winnerCount} ${prizeText}.`, 'success');
        
        // Mettre à jour la liste des tickets si une fonction de callback est fournie
        if (onDrawComplete && typeof onDrawComplete === 'function') {
          console.log('Appel du callback onDrawComplete');
          onDrawComplete();
        }
      } else {
        // Gérer les erreurs spécifiques du serveur
        const errorMessage = response.data.message || 'Le tirage a échoué pour une raison inconnue';
        console.error('Erreur du serveur:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur lors du tirage:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Message d'erreur plus convivial pour l'utilisateur
      let errorMessage = 'Une erreur est survenue lors du tirage';
      
      if (error.response) {
        // Erreur avec réponse du serveur
        if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Données de requête invalides';
        } else if (error.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.response.status === 403) {
          errorMessage = 'Accès refusé. Droits insuffisants.';
        } else if (error.response.status === 404) {
          errorMessage = 'Service de tirage non trouvé';
        } else if (error.response.status >= 500) {
          errorMessage = 'Erreur du serveur. Veuillez réessayer plus tard.';
        }
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        errorMessage = 'Le serveur ne répond pas. Vérifiez votre connexion Internet.';
      }
      
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsDrawing(false);
    }
  };

  const currentPrize = prizes[winners.length];
  const canDrawMore = winners.length < prizes.length && availableTickets.length > 0 && !isDrawing;

  return (
    <Card sx={{ mt: 4, mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Tirage au sort
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {availableTickets.length} tickets restants
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {winners.length > 0 ? (
          <Box>
            <Typography variant="h6" gutterBottom>Gagnants :</Typography>
            <List>
              {winners.map((winner, index) => (
                <Paper key={index} elevation={2} sx={{ mb: 2, p: 2 }}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <PrizeIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={`${winner.prize} - ${winner.firstName} ${winner.lastName}`}
                      secondary={
                        <>
                          <div>Ticket: {winner.code}</div>
                          <div>Téléphone: {winner.phone}</div>
                          <div>Date: {new Date(winner.drawDate).toLocaleString()}</div>
                        </>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          </Box>
        ) : (
          <Alert severity="info">Aucun tirage effectué pour le moment.</Alert>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleDraw}
            disabled={isDrawing || !canDrawMore}
            sx={{ minWidth: 200 }}
          >
            {isDrawing ? 'Tirage en cours...' : `Tirer le ${currentPrize?.name || 'prochain gagnant'}`}
          </Button>
        </Box>
      </CardContent>

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Confirmer le tirage</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir effectuer le tirage pour le {currentPrize?.name} ?</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {availableTickets.length} tickets sont éligibles pour ce tirage.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)} color="primary">
            Annuler
          </Button>
          <Button 
            onClick={confirmDraw} 
            color="primary" 
            variant="contained"
            autoFocus
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default TombolaDraw;
