import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import { Container, Box, Paper, Typography, TextField, Button, Link, CircularProgress, Grid } from '@mui/material';

function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const { isAuthenticated } = useContext(AuthContext);
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
      login(response.data.token);
      navigate('/ventes');
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
        setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const username = prompt("Veuillez entrer votre nom d'utilisateur pour demander une réinitialisation :");
    if (username) {
        try {
            const res = await api.post('/auth/forgot-password', { username });
            showNotification(res.data, 'info');
        } catch (err) {
            showNotification(err.response?.data || 'Erreur', 'error');
        }
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
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
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
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
      
    </Container>
  );
}

export default LoginPage;