import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

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

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
      const API_URL = process.env.REACT_APP_API_URL || 'https://restaurant-app-production-61c2.up.railway.app/api/auth/register';
      const response = await axios.post(REACT_APP_API_URL, formData);
      setSuccess(response.data.message);

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
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
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
          
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>{success}</Alert>}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
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