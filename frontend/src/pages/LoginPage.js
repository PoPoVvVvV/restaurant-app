import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import { Container, Box, Paper, Typography, TextField, Button, Link, CircularProgress, Grid, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const onChange = (e) => {
    const value = e.target.value;
    // Préserver les espaces dans le nom d'utilisateur
    setFormData({ ...formData, [e.target.name]: value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', formData);
      
      // Vérifier que la réponse contient un token
      if (!response.data || !response.data.token) {
        throw new Error('Réponse invalide du serveur');
      }

      // Appeler login et attendre qu'il se termine
      try {
        login(response.data.token);
        
        // Attendre un peu pour que le contexte se mette à jour
        // Utiliser requestAnimationFrame pour s'assurer que React a terminé le rendu
        requestAnimationFrame(() => {
          setTimeout(() => {
            // Vérifier que l'utilisateur est bien connecté avant de naviguer
            const token = localStorage.getItem('token');
            if (token) {
              navigate('/ventes', { replace: true });
            } else {
              setError('Erreur lors de la connexion. Veuillez réessayer.');
              setLoading(false);
            }
          }, 150);
        });
      } catch (loginError) {
        console.error('Erreur lors de la connexion:', loginError);
        setError('Erreur lors de la connexion. Veuillez réessayer.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(err.response?.data?.message || err.message || 'Une erreur est survenue.');
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setForgotPasswordOpen(true);
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotPasswordUsername.trim()) {
      showNotification("Veuillez entrer un nom d'utilisateur.", 'warning');
      return;
    }
    try {
      const res = await api.post('/auth/forgot-password', { username: forgotPasswordUsername });
      showNotification(res.data, 'info');
      setForgotPasswordOpen(false);
      setForgotPasswordUsername('');
    } catch (err) {
      showNotification(err.response?.data || 'Erreur', 'error');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 64px)',
      py: 4
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          mt: 8, 
          p: 5, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 20px 60px rgba(0, 0, 0, 0.4)'
            : '0 20px 60px rgba(0, 0, 0, 0.1)',
          animation: 'scaleIn 0.5s ease-out',
        }}
      >
        <Typography 
          component="h1" 
          variant="h4"
          sx={{ 
            fontWeight: 700,
            mb: 1,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          Connexion
        </Typography>
        <Box component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal" required fullWidth id="username" label="Nom d'utilisateur"
            name="username" autoComplete="username" autoFocus value={formData.username} onChange={onChange}
            inputProps={{ 
              style: { textTransform: 'none' },
              onKeyDown: (e) => {
                // Permettre tous les caractères y compris les espaces
                if (e.key === ' ') {
                  e.stopPropagation();
                }
              },
              onInput: (e) => {
                // S'assurer que les espaces sont préservés
                const value = e.target.value;
                if (value !== formData.username) {
                  setFormData({ ...formData, username: value });
                }
              }
            }}
          />
          <TextField
            margin="normal" required fullWidth name="password" label="Mot de passe"
            type="password" id="password" autoComplete="current-password" value={formData.password} onChange={onChange}
          />
          {error && <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>{error}</Typography>}
          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            sx={{ 
              mt: 3, 
              mb: 2,
              py: 1.5,
              fontSize: '1rem',
              borderRadius: 2,
            }} 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Se connecter'}
          </Button>
          <Grid container sx={{ textAlign: 'center' }}>
            <Grid item xs={12}>
              <Link component="button" type="button" variant="body2" onClick={handleForgotPassword}>
                Mot de passe oublié ?
              </Link>
            </Grid>
            <Grid item xs={12}>
              <Link component={RouterLink} to="/register" variant="body2">
                {"Pas encore de compte ? S'inscrire"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Dialog pour mot de passe oublié */}
      <Dialog open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)}>
        <DialogTitle>Réinitialisation du mot de passe</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom d'utilisateur"
            fullWidth
            variant="outlined"
            value={forgotPasswordUsername}
            onChange={(e) => setForgotPasswordUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleForgotPasswordSubmit();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setForgotPasswordOpen(false);
            setForgotPasswordUsername('');
          }}>
            Annuler
          </Button>
          <Button onClick={handleForgotPasswordSubmit} variant="contained">
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default LoginPage;