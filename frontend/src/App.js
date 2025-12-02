import React, { useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import Snowflakes from './components/Snowflakes';
import ChristmasDecorations from './components/ChristmasDecorations';

import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { EasterEggProvider, useEasterEgg } from './context/EasterEggContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import SnakeGame from './components/SnakeGame';

// Lazy loading des pages pour réduire le bundle initial
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const MaComptabilitePage = lazy(() => import('./pages/MaComptabilitePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const RecipePage = lazy(() => import('./pages/RecipePage'));
const CorporateSalesPage = lazy(() => import('./pages/CorporateSalesPage'));
const AbsencePage = lazy(() => import('./pages/AbsencePage'));
const EasterEggsPage = lazy(() => import('./pages/EasterEggsPage'));

// Composant de chargement
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <CircularProgress />
  </Box>
);

// Composant wrapper pour le jeu Snake
function SnakeGameWrapper() {
  const { showSnakeGame, closeSnakeGame } = useEasterEgg();
  
  return <SnakeGame open={showSnakeGame} onClose={closeSnakeGame} />;
}

function ThemedApp() {
  const { mode } = useThemeMode();

  const theme = useMemo(
    () => createTheme({
      palette: {
        mode,
        primary: {
          main: '#c62828', // Rouge de Noël
          light: '#ff5f52',
          dark: '#8e0000',
          contrastText: '#fff',
        },
        secondary: {
          main: '#2e7d32', // Vert de Noël
          light: '#60ad5e',
          dark: '#005005',
          contrastText: '#fff',
        },
        background: {
          default: mode === 'dark' ? '#0a1a1e' : '#f5f5f5',
          paper: mode === 'dark' ? '#1e2b2e' : '#ffffff',
        },
        christmas: {
          gold: '#ffd700',
          red: '#c62828',
          green: '#2e7d32',
        },
      },
      typography: {
        fontFamily: '"Mountains of Christmas", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontFamily: '"Mountains of Christmas", cursive',
          fontWeight: 700,
        },
        h2: {
          fontFamily: '"Mountings of Christmas", cursive',
          fontWeight: 600,
        },
      },
      components: {
        MuiAppBar: {
          styleOverrides: {
            root: {
              background: 'linear-gradient(45deg, #c62828 30%, #2e7d32 90%)',
              boxShadow: '0 4px 20px rgba(198, 40, 40, 0.3)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 20,
              textTransform: 'none',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)',
              },
            },
            containedPrimary: {
              background: 'linear-gradient(45deg, #c62828 30%, #8e0000 90%)',
            },
            containedSecondary: {
              background: 'linear-gradient(45deg, #2e7d32 30%, #005005 90%)',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29-22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23c62828\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              },
              transition: 'all 0.3s ease-in-out',
            },
          },
        },
      },
    }),
    [mode]
  );

  // Ajout de la police Mountains of Christmas
  React.useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Effet de neige
    document.body.style.background = mode === 'dark' ? '#0a1a1e' : 'linear-gradient(135deg, #f5f5f5 0%, #f0f0f0 100%)';
    
    return () => {
      document.head.removeChild(link);
    };
  }, [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Snowflakes count={100} />
      <ChristmasDecorations />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '20px',
        background: 'linear-gradient(90deg, #c62828, #2e7d32, #c62828)',
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }} />
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30px',
        background: 'linear-gradient(90deg, #2e7d32, #c62828, #2e7d32)',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)'
      }} />
      <Router>
        <EasterEggProvider>
          <Navbar style={{ position: 'relative', zIndex: 10 }} />
          <main style={{ padding: '20px', position: 'relative', zIndex: 2 }}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Routes Publiques */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                
                {/* Routes Protégées */}
                <Route path="/ventes" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
                <Route path="/ventes-entreprises" element={<ProtectedRoute><CorporateSalesPage /></ProtectedRoute>} />
                <Route path="/stocks" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
                <Route path="/recettes" element={<ProtectedRoute><RecipePage /></ProtectedRoute>} />
                <Route path="/absences" element={<ProtectedRoute><AbsencePage /></ProtectedRoute>} />
                <Route path="/comptabilite" element={<ProtectedRoute><MaComptabilitePage /></ProtectedRoute>} />
                <Route path="/easter-eggs" element={<ProtectedRoute><EasterEggsPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPage /></ProtectedRoute>} />
                
                {/* Route par défaut */}
                <Route path="/" element={<Navigate to="/ventes" />} />
              </Routes>
            </Suspense>
          </main>
          <SnakeGameWrapper />
        </EasterEggProvider>
      </Router>
    </MuiThemeProvider>
  );
}


function App() {
  return (
    <AuthProvider>
      <ThemeModeProvider>
        <NotificationProvider>
          <ThemedApp />
        </NotificationProvider>
      </ThemeModeProvider>
    </AuthProvider>
  );
}

export default App;