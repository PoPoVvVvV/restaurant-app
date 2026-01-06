import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { 
  Container, Paper, Typography, Grid, CircularProgress, Box, 
  Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText,
  TableContainer, Table, TableBody, TableRow, TableCell
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Composant pour le classement
const Leaderboard = () => {
    const [data, setData] = useState([]);
    useEffect(() => {
        api.get('/reports/leaderboard')
           .then(res => setData(res.data))
           .catch(err => console.error("Erreur chargement classement."));
    }, []);
    return (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            height: '100%',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(148, 163, 184, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 3,
          }}
        >
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 2,
              }}
            >
              🏆 Top 5 Vendeurs de la Semaine
            </Typography>
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

  // Calculs séparés par type de vente - mémorisés pour éviter les recalculs
  const ventesParticuliers = useMemo(() => 
    transactions.filter(t => t.saleType === 'particulier'), 
    [transactions]
  );
  
  const ventesEntreprises = useMemo(() => 
    transactions.filter(t => t.saleType === 'entreprise'), 
    [transactions]
  );
  
  const totalCAParticuliers = useMemo(() => 
    ventesParticuliers.reduce((sum, t) => sum + t.totalAmount, 0), 
    [ventesParticuliers]
  );
  
  const totalCAEntreprises = useMemo(() => 
    ventesEntreprises.reduce((sum, t) => sum + t.totalAmount, 0), 
    [ventesEntreprises]
  );
  
  const totalCA = useMemo(() => 
    totalCAParticuliers + totalCAEntreprises, 
    [totalCAParticuliers, totalCAEntreprises]
  );
  
  const totalMarginParticuliers = useMemo(() => 
    ventesParticuliers.reduce((sum, t) => sum + t.margin, 0), 
    [ventesParticuliers]
  );
  
  const totalMarginEntreprises = useMemo(() => 
    ventesEntreprises.reduce((sum, t) => sum + t.margin, 0), 
    [ventesEntreprises]
  );
  
  const totalMargin = useMemo(() => 
    totalMarginParticuliers + totalMarginEntreprises, 
    [totalMarginParticuliers, totalMarginEntreprises]
  );
  
  const totalBonus = useMemo(() => 
    totalMargin * bonusPercentage, 
    [totalMargin, bonusPercentage]
  );
  
  const nombreDeVentesParticuliers = useMemo(() => ventesParticuliers.length, [ventesParticuliers]);
  const nombreDeVentesEntreprises = useMemo(() => ventesEntreprises.length, [ventesEntreprises]);
  const nombreDeVentes = useMemo(() => transactions.length, [transactions]);

  // Préparer les données pour les graphiques séparés - mémorisé
  const dailyDataParticuliers = useMemo(() => {
    const baseData = dailyData.map(day => ({
      ...day,
      VentesParticuliers: 0,
      VentesEntreprises: 0
    }));

    // Calculer les ventes par jour et par type
    transactions.forEach(transaction => {
      const dayOfWeek = new Date(transaction.createdAt).getDay();
      const dayName = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][dayOfWeek];
      const dayData = baseData.find(d => d.name === dayName);
      if (dayData) {
        if (transaction.saleType === 'particulier') {
          dayData.VentesParticuliers += transaction.totalAmount;
        } else if (transaction.saleType === 'entreprise') {
          dayData.VentesEntreprises += transaction.totalAmount;
        }
      }
    });
    
    return baseData;
  }, [dailyData, transactions]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{
          fontWeight: 700,
          mb: 4,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}
      >
        Tableau de Bord - {user?.username}
      </Typography>

      <Grid container spacing={3}>
        {/* Cartes de KPIs - Totaux */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                : 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(99, 102, 241, 0.3)'
                : '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 12px 32px rgba(99, 102, 241, 0.3)'
                  : '0 12px 32px rgba(99, 102, 241, 0.2)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, opacity: 0.8 }}>Grade</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.grade || 'N/A'}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                : 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(99, 102, 241, 0.3)'
                : '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, opacity: 0.8 }}>Ventes Total</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{nombreDeVentes}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                : 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(99, 102, 241, 0.3)'
                : '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, opacity: 0.8 }}>CA Total</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>${totalCA.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                : 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(99, 102, 241, 0.3)'
                : '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, opacity: 0.8 }}>Marge Total</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>${totalMargin.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>Salaire Estimé</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>${totalBonus.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        
        {/* Cartes de KPIs - Ventes Particuliers */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(99, 102, 241, 0.3)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>Ventes Particuliers</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>{nombreDeVentesParticuliers}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>CA Particuliers</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>${totalCAParticuliers.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>Marge Particuliers</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>${totalMarginParticuliers.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        
        {/* Cartes de KPIs - Ventes Entreprises */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(236, 72, 153, 0.3)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>Ventes Entreprises</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>{nombreDeVentesEntreprises}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>CA Entreprises</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>${totalCAEntreprises.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>Marge Entreprises</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>${totalMarginEntreprises.toFixed(2)}</Typography>
          </Paper>
        </Grid>

        {/* Graphique des ventes */}
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              height: '400px',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)'
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 3,
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 3,
              }}
            >
              Ventes Journalières de la Semaine par Type
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={dailyDataParticuliers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="VentesParticuliers" fill="#2196f3" name="Ventes Particuliers" />
                <Bar dataKey="VentesEntreprises" fill="#e91e63" name="Ventes Entreprises" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Classement */}
        <Grid item xs={12} md={4}>
            <Leaderboard />
        </Grid>
        
        {/* Résumé comparatif */}
        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              mt: 2,
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)'
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 3,
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 3,
              }}
            >
              📊 Résumé Comparatif des Ventes
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="primary" gutterBottom>Ventes Particuliers</Typography>
                <Typography variant="body2">Nombre de ventes: <strong>{nombreDeVentesParticuliers}</strong></Typography>
                <Typography variant="body2">Chiffre d'affaires: <strong>${totalCAParticuliers.toFixed(2)}</strong></Typography>
                <Typography variant="body2">Marge: <strong>${totalMarginParticuliers.toFixed(2)}</strong></Typography>
                <Typography variant="body2">Moyenne par vente: <strong>${nombreDeVentesParticuliers > 0 ? (totalCAParticuliers / nombreDeVentesParticuliers).toFixed(2) : '0.00'}</strong></Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="secondary" gutterBottom>Ventes Entreprises</Typography>
                <Typography variant="body2">Nombre de ventes: <strong>{nombreDeVentesEntreprises}</strong></Typography>
                <Typography variant="body2">Chiffre d'affaires: <strong>${totalCAEntreprises.toFixed(2)}</strong></Typography>
                <Typography variant="body2">Marge: <strong>${totalMarginEntreprises.toFixed(2)}</strong></Typography>
                <Typography variant="body2">Moyenne par vente: <strong>${nombreDeVentesEntreprises > 0 ? (totalCAEntreprises / nombreDeVentesEntreprises).toFixed(2) : '0.00'}</strong></Typography>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" color="text.primary">
                <strong>Répartition:</strong> {nombreDeVentes > 0 ? ((nombreDeVentesParticuliers / nombreDeVentes) * 100).toFixed(1) : '0'}% particuliers, 
                {nombreDeVentes > 0 ? ((nombreDeVentesEntreprises / nombreDeVentes) * 100).toFixed(1) : '0'}% entreprises
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Historique détaillé */}
        <Grid item xs={12}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2 }}>
                Historique Détaillé de la Semaine
            </Typography>
            {transactions.length === 0 ? (
                <Typography>Vous n'avez encore enregistré aucune transaction cette semaine.</Typography>
            ) : (
                transactions.map(t => (
                <Accordion key={t._id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Grid container justifyContent="space-between" alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <Typography>{new Date(t.createdAt).toLocaleString('fr-FR')}</Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: t.saleType === 'entreprise' ? 'secondary.main' : 'primary.main',
                              fontWeight: 'bold',
                              px: 1,
                              py: 0.5,
                              bgcolor: t.saleType === 'entreprise' ? 'secondary.light' : 'primary.light',
                              borderRadius: 1
                            }}
                          >
                            {t.saleType === 'entreprise' ? '🏢 Vente Entreprise' : '👤 Vente Particulier'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                          <Typography variant="body1" component="span" sx={{ mr: 2 }}>Total: <strong>${t.totalAmount.toFixed(2)}</strong></Typography>
                          <Typography variant="body1" component="span" color="text.secondary">Marge: ${t.margin.toFixed(2)}</Typography>
                        </Grid>
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

export default MaComptabilitePage;