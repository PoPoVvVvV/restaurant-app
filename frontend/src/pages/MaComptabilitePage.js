import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { 
  Container, Paper, Typography, Grid, CircularProgress, Box, 
  Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText,
  TableContainer, Table, TableBody, TableRow, TableCell
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconButton, Slider } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

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

function MaComptabilitePage() {
  const { user } = useContext(AuthContext);
  // Audio pour ambiance Halloween sur cette page
  const audioRef = useRef(null);
  const [audioError, setAudioError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(() => {
    try { const m = localStorage.getItem('halloween-muted'); return m !== null ? JSON.parse(m) : false; } catch (e) { return false; }
  });
  const [volume, setVolume] = useState(() => {
    try { const v = localStorage.getItem('halloween-volume'); return v !== null ? Number(v) : 25; } catch (e) { return 25; }
  });
  const [transactions, setTransactions] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [bonusPercentage, setBonusPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // audio init & autoplay when this page mounts
    // check if navigation to this page was triggered by a user click on the
    // navbar (stored in sessionStorage). If so, treat as a user gesture and try
    // to play audible audio immediately.
    let userGesture = false;
    try {
      const intent = sessionStorage.getItem('maComptaUserIntent');
      if (intent && (Date.now() - Number(intent) < 5000)) {
        userGesture = true;
        sessionStorage.removeItem('maComptaUserIntent');
      }
    } catch (e) {}
    if (!audioRef.current) {
      const audio = new Audio('/halloween-loop.mp3');
      audio.loop = true;
      audio.preload = 'auto';
      audio.autoplay = true;
      audio.playsInline = true;
      try { audio.crossOrigin = 'anonymous'; } catch (e) {}
      audio.volume = Math.max(0, Math.min(1, volume / 100));
      audio.muted = !!muted;
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const tryPlay = async () => {
      try {
        // if userGesture is true, force unmuted to respect the click gesture
        audio.muted = userGesture ? false : (!!muted ? true : false);
        audio.volume = Math.max(0, Math.min(1, volume / 100));
        await audio.play();
        setIsPlaying(true);
        setAudioError(false);
      } catch (err) {
        try {
          audio.muted = true;
          await audio.play();
          setIsPlaying(true);
          setAudioError(false);
        } catch (err2) {
          try {
            const resp = await fetch('/halloween-loop.mp3');
            const arrayBuffer = await resp.arrayBuffer();
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              try { await ctx.resume(); } catch (e) {}
              const decoded = await ctx.decodeAudioData(arrayBuffer);
              const src = ctx.createBufferSource();
              src.buffer = decoded;
              const gain = ctx.createGain();
              gain.gain.value = Math.max(0, Math.min(1, volume / 100));
              src.loop = true;
              src.connect(gain).connect(ctx.destination);
              src.start(0);
              audioRef.current._webaudio = { ctx, src, gain };
              setIsPlaying(true);
              setAudioError(false);
            } else {
              setAudioError(true);
              setIsPlaying(false);
            }
          } catch (err3) {
            setAudioError(true);
            setIsPlaying(false);
          }
        }
      }
    };

    tryPlay();

    return () => {
      // cleanup audio on leaving page
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch (e) {}
        try { audioRef.current.currentTime = 0; } catch (e) {}
        if (audioRef.current._webaudio) {
          try { audioRef.current._webaudio.src.stop(); } catch (e) {}
          try { audioRef.current._webaudio.ctx.close(); } catch (e) {}
          delete audioRef.current._webaudio;
        }
      }
      setIsPlaying(false);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      try { audio.pause(); } catch (e) {}
      if (audio._webaudio) {
        try { audio._webaudio.src.stop(); } catch (e) {}
        try { audio._webaudio.ctx.close(); } catch (e) {}
        delete audio._webaudio;
      }
      setIsPlaying(false);
    } else {
      try { await audio.play(); setIsPlaying(true); setAudioError(false); } catch (e) { setAudioError(true); }
    }
  };

  const handleToggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const newMuted = !muted;
    audio.muted = newMuted;
    setMuted(newMuted);
    try { localStorage.setItem('halloween-muted', JSON.stringify(newMuted)); } catch (e) {}
  };

  const handleVolumeChange = (e, value) => {
    const audio = audioRef.current;
    const v = Number(value);
    setVolume(v);
    try { localStorage.setItem('halloween-volume', String(v)); } catch (e) {}
    if (audio) {
      if (audio._webaudio) {
        try { audio._webaudio.gain.gain.value = Math.max(0, Math.min(1, v / 100)); } catch (e) {}
      } else {
        try { audio.volume = Math.max(0, Math.min(1, v / 100)); } catch (e) {}
      }
      if (v === 0) {
        audio.muted = true;
        setMuted(true);
      } else {
        audio.muted = false;
        setMuted(false);
      }
    }
  };
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

  // Calculs séparés par type de vente
  const ventesParticuliers = transactions.filter(t => t.saleType === 'particulier');
  const ventesEntreprises = transactions.filter(t => t.saleType === 'entreprise');
  
  const totalCAParticuliers = ventesParticuliers.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalCAEntreprises = ventesEntreprises.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalCA = totalCAParticuliers + totalCAEntreprises;
  
  const totalMarginParticuliers = ventesParticuliers.reduce((sum, t) => sum + t.margin, 0);
  const totalMarginEntreprises = ventesEntreprises.reduce((sum, t) => sum + t.margin, 0);
  const totalMargin = totalMarginParticuliers + totalMarginEntreprises;
  
  const totalBonus = totalMargin * bonusPercentage;
  const nombreDeVentesParticuliers = ventesParticuliers.length;
  const nombreDeVentesEntreprises = ventesEntreprises.length;
  const nombreDeVentes = transactions.length;

  // Préparer les données pour les graphiques séparés
  const dailyDataParticuliers = dailyData.map(day => ({
    ...day,
    VentesParticuliers: 0,
    VentesEntreprises: 0
  }));

  // Calculer les ventes par jour et par type
  transactions.forEach(transaction => {
    const dayOfWeek = new Date(transaction.createdAt).getDay();
    const dayName = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][dayOfWeek];
    const dayData = dailyDataParticuliers.find(d => d.name === dayName);
    if (dayData) {
      if (transaction.saleType === 'particulier') {
        dayData.VentesParticuliers += transaction.totalAmount;
      } else if (transaction.saleType === 'entreprise') {
        dayData.VentesEntreprises += transaction.totalAmount;
      }
    }
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Tableau de Bord - {user?.username}
      </Typography>

      <Grid container spacing={3}>
        {/* Cartes de KPIs - Totaux */}
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Grade</Typography><Typography variant="h4" color="primary">{user?.grade || 'N/A'}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Ventes Total</Typography><Typography variant="h4">{nombreDeVentes}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">CA Total</Typography><Typography variant="h4">${totalCA.toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Marge Total</Typography><Typography variant="h4">${totalMargin.toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}><Typography variant="h6">Salaire Estimé</Typography><Typography variant="h4">${totalBonus.toFixed(2)}</Typography></Paper></Grid>
        
        {/* Cartes de KPIs - Ventes Particuliers */}
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}><Typography variant="h6">Ventes Particuliers</Typography><Typography variant="h4">{nombreDeVentesParticuliers}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}><Typography variant="h6">CA Particuliers</Typography><Typography variant="h4">${totalCAParticuliers.toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}><Typography variant="h6">Marge Particuliers</Typography><Typography variant="h4">${totalMarginParticuliers.toFixed(2)}</Typography></Paper></Grid>
        
        {/* Cartes de KPIs - Ventes Entreprises */}
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}><Typography variant="h6">Ventes Entreprises</Typography><Typography variant="h4">{nombreDeVentesEntreprises}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}><Typography variant="h6">CA Entreprises</Typography><Typography variant="h4">${totalCAEntreprises.toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={2}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}><Typography variant="h6">Marge Entreprises</Typography><Typography variant="h4">${totalMarginEntreprises.toFixed(2)}</Typography></Paper></Grid>

        {/* Graphique des ventes */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>Ventes Journalières de la Semaine par Type</Typography>
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
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>📊 Résumé Comparatif des Ventes</Typography>
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
      {/* Panneau de contrôle audio Halloween (fixé) */}
      <Box
        sx={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          bgcolor: 'rgba(20,20,20,0.88)',
          border: '1px solid rgba(151,71,255,0.08)',
          p: 1,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          boxShadow: '0 6px 20px rgba(0,0,0,0.6), 0 0 12px rgba(255,133,51,0.06)',
          zIndex: 1400,
        }}
      >
        <IconButton onClick={togglePlay} size="small" sx={{ color: 'orange', bgcolor: 'transparent' }} aria-label="play-pause">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        <IconButton onClick={handleToggleMute} size="small" sx={{ color: muted ? 'gray' : 'orange' }} aria-label="mute-unmute">
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>

        <Box sx={{ width: 140, px: 1 }}>
          <Slider value={volume} onChange={handleVolumeChange} aria-label="volume" size="small" />
        </Box>

        {/* Indicateur discret quand la musique joue */}
        <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: isPlaying && !muted ? 'orange' : 'rgba(255,133,51,0.18)',
              boxShadow: isPlaying && !muted ? '0 0 8px rgba(255,133,51,0.9)' : 'none',
              transition: 'all 250ms ease',
              animation: isPlaying && !muted ? 'pulse 1.6s infinite' : 'none',
            }}
            aria-hidden
          />
        </Box>
      </Box>
    </Container>
  );
}

export default MaComptabilitePage;