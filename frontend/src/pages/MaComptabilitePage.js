import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Imports depuis Material-UI
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function MaComptabilitePage() {
  const [transactions, setTransactions] = useState([]);
  const [bonusPercentage, setBonusPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [transacRes, settingsRes] = await Promise.all([
          api.get('/transactions/me'),
          api.get('/settings/bonusPercentage').catch(() => ({ data: { value: 0 } }))
        ]);
        setTransactions(transacRes.data);
        setBonusPercentage(settingsRes.data.value);
      } catch (err) {
        setError('Impossible de charger les données.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalCA = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalMargin = transactions.reduce((sum, t) => sum + t.margin, 0);
  const totalBonus = totalMargin * bonusPercentage;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" align="center">{error}</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Ma Comptabilité
      </Typography>

      {/* Section des totaux */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Chiffre d'Affaires</Typography>
            <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
              ${totalCA.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Marge Générée</Typography>
            <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
              ${totalMargin.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light', color: 'white' }}>
            <Typography variant="h6">Salaire Estimé ({(bonusPercentage * 100).toFixed(0)}%)</Typography>
            <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
              ${totalBonus.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Historique des transactions */}
      <Typography variant="h5" component="h2" gutterBottom>
        Historique Détaillé
      </Typography>
      {transactions.length === 0 ? (
        <Typography>Vous n'avez encore enregistré aucune transaction.</Typography>
      ) : (
        transactions.map(t => (
          <Accordion key={t._id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Grid container justifyContent="space-between" alignItems="center">
                <Grid item xs={6}>
                  <Typography>{new Date(t.createdAt).toLocaleString('fr-FR')}</Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="body1" component="span" sx={{ mr: 2 }}>
                    Total: <strong>${t.totalAmount.toFixed(2)}</strong>
                  </Typography>
                  <Typography variant="body1" component="span" color="text.secondary">
                    Marge: ${t.margin.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: 'action.hover' }}>
              <Typography variant="subtitle2">Détail des produits vendus :</Typography>
              <List dense>
                {t.products.map((p, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${p.quantity} x (Produit ID: ${p.productId})`}
                      secondary={`Vendu à ${p.priceAtSale.toFixed(2)}$ / unité`}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Container>
  );
}

export default MaComptabilitePage;