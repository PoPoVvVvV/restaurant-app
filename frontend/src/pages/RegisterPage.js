import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../services/api';

// Imports depuis Material-UI
import { Container, Box, Paper, Typography, TextField, Button, Link, CircularProgress, Alert } from '@mui/material';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    invitationCode: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { username, password, invitationCode } = formData;

  const onChange = (e) => {
    const value = e.target.value;
    // Préserver les espaces dans le nom d'utilisateur
    setFormData({ ...formData, [e.target.name]: value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/register', formData);
      setSuccess(response.data.message + ' Redirection vers la connexion...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
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
          Créer un Compte
        </Typography>
        <Box component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Nom d'utilisateur"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={onChange}
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
                if (value !== username) {
                  setFormData({ ...formData, username: value });
                }
              }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Mot de passe"
            type="password"
            id="password"
            value={password}
            onChange={onChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="invitationCode"
            label="Code d'invitation"
            type="text"
            id="invitationCode"
            value={invitationCode}
            onChange={onChange}
          />
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mt: 2, 
                width: '100%',
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}
          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mt: 2, 
                width: '100%',
                borderRadius: 2,
              }}
            >
              {success}
            </Alert>
          )}

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
            {loading ? <CircularProgress size={24} color="inherit" /> : "S'inscrire"}
          </Button>

          <Box textAlign="center">
            <Link component={RouterLink} to="/login" variant="body2">
              {"Déjà un compte ? Se connecter"}
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default RegisterPage;