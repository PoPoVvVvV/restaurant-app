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
  IconButton
} from '@mui/material';
import { EmojiEvents as PrizeIcon, Close as CloseIcon } from '@mui/icons-material';

const prizes = [
  { id: 1, name: '1er Prix', description: 'Grand Prix Principal' },
  { id: 2, name: '2ème Prix', description: 'Deuxième Prix' },
  { id: 3, name: '3ème Prix', description: 'Troisième Prix' }
];

const TombolaDraw = ({ tickets, onDrawComplete }) => {
  const [winners, setWinners] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [currentDraw, setCurrentDraw] = useState(null);
  const [availableTickets, setAvailableTickets] = useState([...tickets]);

  useEffect(() => {
    // Réinitialiser les gagnants et les tickets disponibles quand la liste des tickets change
    setWinners([]);
    setAvailableTickets([...tickets]);
  }, [tickets]);

  const drawWinner = () => {
    if (availableTickets.length === 0) {
      alert('Aucun ticket disponible pour le tirage');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableTickets.length);
    const winner = availableTickets[randomIndex];
    
    // Retirer le gagnant des tickets disponibles
    const newAvailableTickets = availableTickets.filter((_, index) => index !== randomIndex);
    setAvailableTickets(newAvailableTickets);
    
    return winner;
  };

  const handleDraw = () => {
    const nextPrize = prizes[winners.length];
    if (!nextPrize) return;

    setCurrentDraw(nextPrize);
    setOpenConfirm(true);
  };

  const confirmDraw = () => {
    setOpenConfirm(false);
    setIsDrawing(true);
    
    // Simulation d'animation de tirage
    setTimeout(() => {
      const winner = drawWinner();
      if (winner) {
        const newWinner = {
          ...winner,
          prize: currentPrize.name,
          prizeId: currentPrize.id,
          drawDate: new Date().toISOString()
        };
        
        setWinners(prev => [...prev, newWinner]);
        
        // Sauvegarder les gagnants dans le localStorage
        const savedWinners = JSON.parse(localStorage.getItem('tombolaWinners') || '[]');
        localStorage.setItem('tombolaWinners', JSON.stringify([...savedWinners, newWinner]));
        
        // Mettre à jour les tickets dans le localStorage pour marquer les gagnants
        const allTickets = JSON.parse(localStorage.getItem('tombolaTickets') || '[]');
        const updatedTickets = allTickets.map(ticket => 
          ticket.id === newWinner.id ? { ...ticket, isWinner: true, prize: newWinner.prize } : ticket
        );
        localStorage.setItem('tombolaTickets', JSON.stringify(updatedTickets));
        
        if (onDrawComplete) {
          onDrawComplete(updatedTickets);
        }
      }
      
      setIsDrawing(false);
    }, 2000);
  };

  const currentPrize = prizes[winners.length];
  const canDrawMore = winners.length < prizes.length && availableTickets.length > 0;

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
    </Card>
  );
};

export default TombolaDraw;
