import React, { useMemo, Suspense, lazy, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import Snowflakes from './components/Snowflakes';
import FestiveDecorations from './components/FestiveDecorations';

import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { EasterEggProvider, useEasterEgg } from './context/EasterEggContext';

// Fonction de chargement optimisé avec mémoïsation
const withLazy = (importFn) => {
  let Component = null;
  
  return React.memo((props) => {
    const LazyComponent = React.useMemo(
      () => lazy(importFn),
      [] // Ne se recrée jamais
    );
    
    return <LazyComponent {...props} />;
  });
};

// Composants UI avec chargement optimisé
const Navbar = withLazy(() => import('./components/Navbar'));
const ProtectedRoute = withLazy(() => import('./components/ProtectedRoute'));
const PublicRoute = withLazy(() => import('./components/PublicRoute'));
const SnakeGameWrapper = withLazy(() => import('./components/SnakeGameWrapper'));

// Pages avec chargement optimisé
const LoginPage = withLazy(() => import('./pages/LoginPage'));
const RegisterPage = withLazy(() => import('./pages/RegisterPage'));
const SalesPage = withLazy(() => import('./pages/SalesPage'));
const CorporateSalesPage = withLazy(() => import('./pages/CorporateSalesPage'));
const StockPage = withLazy(() => import('./pages/StockPage'));
const RecipePage = withLazy(() => import('./pages/RecipePage'));
const AbsencePage = withLazy(() => import('./pages/AbsencePage'));
const MaComptabilitePage = withLazy(() => import('./pages/MaComptabilitePage'));
const EasterEggsPage = withLazy(() => import('./pages/EasterEggsPage'));
const AdminPage = withLazy(() => import('./pages/AdminPage'));

// Composant de chargement optimisé
const LoadingFallback = React.memo(() => {
  const styles = useMemo(() => ({
    container: { 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      backgroundColor: 'transparent'
    }
  }), []);

  return (
    <div style={styles.container}>
      <CircularProgress disableShrink />
    </div>
  );
});

function ThemedApp({ children }) {
  const { mode } = useThemeMode();

  // Configuration du thème optimisée
  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    const primaryColor = '#c62828';
    const secondaryColor = '#2e7d32';
    
    return createTheme({
      palette: {
        mode,
        primary: {
          main: primaryColor,
          light: '#ff5f52',
          dark: '#8e0000',
          contrastText: '#fff',
        },
        secondary: {
          main: secondaryColor,
          light: '#60ad5e',
          dark: '#005005',
          contrastText: '#fff',
        },
        background: {
          default: isDark ? '#0a1a1e' : '#f5f5f5',
          paper: isDark ? '#1e2b2e' : '#ffffff',
        },
        christmas: {
          gold: '#ffd700',
          red: primaryColor,
          green: secondaryColor,
        },
      },
      typography: {
        fontFamily: '"Mountains of Christmas", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontFamily: '"Mountains of Christmas", cursive',
          fontWeight: 700,
        },
        h2: {
          fontFamily: '"Mountains of Christmas", cursive',
          fontWeight: 600,
        },
      },
      components: {
        MuiAppBar: {
          defaultProps: {
            elevation: 0,
          },
          styleOverrides: {
            root: {
              background: `linear-gradient(45deg, ${primaryColor} 30%, ${secondaryColor} 90%)`,
              boxShadow: '0 4px 20px rgba(198, 40, 40, 0.3)',
              willChange: 'transform',
              transition: 'transform 0.2s ease-in-out',
            },
          },
        },
        MuiButton: {
          defaultProps: {
            disableRipple: true,
            disableElevation: true,
          },
          styleOverrides: {
            root: {
              borderRadius: 20,
              textTransform: 'none',
              fontWeight: 'bold',
              willChange: 'transform, box-shadow',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)',
              },
            },
            containedPrimary: {
              background: `linear-gradient(45deg, ${primaryColor} 30%, #8e0000 90%)`,
            },
            containedSecondary: {
              background: `linear-gradient(45deg, ${secondaryColor} 30%, #005005 90%)`,
            },
          },
        },
        MuiCard: {
          defaultProps: {
            elevation: 0,
          },
          styleOverrides: {
            root: {
              borderRadius: 12,
              willChange: 'transform, box-shadow',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              },
            },
          },
        },
      },
    });
  }, [mode]);

  // Gestion des ressources externes
  useEffect(() => {
    // Chargement optimisé de la police
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    link.as = 'style';
    link.onload = () => document.body.classList.add('font-loaded');
    
    // Préchargement des polices critiques
    const preloadLink = document.createElement('link');
    preloadLink.href = 'https://fonts.gstatic.com/s/mountainsofchristmas/v20/3y9D6b4xCq1CvPoXnRopK6e9APZ7xQEBQ.woff2';
    preloadLink.rel = 'preload';
    preloadLink.as = 'font';
    preloadLink.crossOrigin = 'anonymous';
    
    // Application du style de fond optimisé
    const isDark = mode === 'dark';
    document.body.style.background = isDark ? '#0a1a1e' : 'linear-gradient(135deg, #f5f5f5 0%, #f0f0f0 100%)';
    document.documentElement.style.setProperty('--bg-color', isDark ? '#0a1a1e' : '#f5f5f5');
    
    // Ajout des éléments au DOM
    document.head.appendChild(link);
    document.head.appendChild(preloadLink);
    
    // Nettoyage
    return () => {
      document.head.removeChild(link);
      if (document.head.contains(preloadLink)) {
        document.head.removeChild(preloadLink);
      }
    };
  }, [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Snowflakes count={100} />
      <FestiveDecorations />
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
      <EasterEggProvider>
        <Suspense fallback={null}>
          <Navbar style={{ position: 'relative', zIndex: 10 }} />
          <main style={{ padding: '20px', position: 'relative', zIndex: 2 }}>
            <Suspense fallback={<LoadingFallback />}>
              {children}
            </Suspense>
          </main>
          <SnakeGameWrapper />
        </Suspense>
      </EasterEggProvider>
    </MuiThemeProvider>
  );
}

// Composant App optimisé avec React.memo
const App = React.memo(() => {
  // Mémoïsation des fournisseurs de contexte
  const providers = useMemo(() => [
    { component: ThemeModeProvider },
    { component: AuthProvider },
    { component: NotificationProvider },
    { component: EasterEggProvider }
  ], []);

  // Fonction pour composer les fournisseurs de contexte
  const Providers = useCallback(({ providers, children }) => {
    return providers.reduceRight((acc, { component: Provider, props = {} }, index) => {
      return <Provider {...props}>{acc}</Provider>;
    }, children);
  }, []);

  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Providers providers={providers}>
          <ThemedApp>
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
          </ThemedApp>
        </Providers>
      </Suspense>
    </Router>
  );
});

// Ajout du displayName pour le débogage
App.displayName = 'App';

export default App;