import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Mettre à jour l'état pour que le prochain rendu affiche l'UI de secours
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Enregistrer l'erreur dans la console pour le débogage
    console.error('Erreur capturée par ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Recharger la page pour réinitialiser complètement l'application
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // UI de secours personnalisée
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
                : 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <ErrorOutlineIcon 
              sx={{ 
                fontSize: 64, 
                color: 'error.main', 
                mb: 2 
              }} 
            />
            <Typography variant="h4" gutterBottom>
              Oups ! Une erreur s'est produite
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              L'application a rencontré une erreur inattendue. Veuillez réessayer.
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box 
                sx={{ 
                  mt: 3, 
                  p: 2, 
                  bgcolor: 'error.light', 
                  borderRadius: 2,
                  textAlign: 'left',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}
              >
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleReset}
              sx={{ mt: 3 }}
            >
              Recharger l'application
            </Button>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

