import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Container, Paper, Typography, Grid, CircularProgress, Box, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function MaComptabilitePage() {
  const { user } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [bonusPercentage, setBonusPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transacRes, settingsRes, dailyRes] = await Promise.all([
          api.get('/transactions/me'),
          api.get('/settings/bonusPercentage').catch(() => ({ data: { value: 0 } })),
          api.get('/reports/daily-sales/me')
        ]);
        setTransactions(transacRes.data);
        setBonusPercentage(settingsRes.data.value);
        setDailyData(dailyRes.data);
      } catch (err) {
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Tableau de Bord - {user?.username}
      </Typography>

      <Grid container spacing={3}>
        {/* Cartes de KPIs */}
        <Grid item xs={12} sm={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Grade</Typography><Typography variant="h4" color="primary">{user?.grade || 'N/A'}</Typography></Paper></Grid>
        <Grid item xs={12} sm={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">CA Semaine</Typography><Typography variant="h4">${totalCA.toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Marge Semaine</Typography><Typography variant="h4">${totalMargin.toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={3}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}><Typography variant="h6">Prime Estimée</Typography><Typography variant="h4">${totalBonus.toFixed(2)}</Typography></Paper></Grid>

        {/* Graphique des ventes */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>Ventes Journalières de la Semaine</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Ventes" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Classement */}
        <Grid item xs={12} md={4}>
            <Leaderboard />
        </Grid>
        
        {/* Historique détaillé */}
        <Grid item xs={12}>
            <Typography variant="h5" component="h2" gutterBottom>
                Historique Détaillé de la Semaine
            </Typography>
            {transactions.length === 0 ? (
                <Typography>Vous n'avez encore enregistré aucune transaction cette semaine.</Typography>
            ) : (
                transactions.map(t => (
                <Accordion key={t._id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Grid container justifyContent="space-between" alignItems="center">
                        <Grid item xs={6}><Typography>{new Date(t.createdAt).toLocaleString('fr-FR')}</Typography></Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography variant="body1" component="span" sx={{ mr: 2 }}>Total: <strong>${t.totalAmount.toFixed(2)}</strong></Typography><Typography variant="body1" component="span" color="text.secondary">Marge: ${t.margin.toFixed(2)}</Typography></Grid>
                    </Grid>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: 'action.hover' }}>
                    <Typography variant="subtitle2">Détail des produits vendus :</Typography>
                    <List dense>
                        {t.products.map((p, index) => (<ListItem key={index}><ListItemText primary={`${p.quantity} x ${p.name || 'Produit'}`} secondary={`Vendu à ${p.priceAtSale.toFixed(2)}$ / unité`} /></ListItem>))}
                    </List>
                    </AccordionDetails>
                </Accordion>
                ))
            )}
        </Grid>
      </Grid>
    </Container>
  );
}

// Composant pour le classement
const Leaderboard = () => {
    const [data, setData] = useState([]);
    useEffect(() => {
        api.get('/reports/leaderboard')
           .then(res => setData(res.data))
           .catch(err => console.error("Erreur chargement classement."));
    }, []);
    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>🏆 Top 5 Vendeurs de la Semaine</Typography>
            <TableContainer>
                <Table size="small">
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>#{index + 1}</TableCell>
                                <TableCell>{row.employeeName}</TableCell>
                                <TableCell align="right">${row.totalRevenue.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default MaComptabilitePage;