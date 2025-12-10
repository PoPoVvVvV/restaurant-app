import React, { useMemo, Suspense, lazy, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { CircularProgress, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Snowflakes from './components/Snowflakes';
import FestiveDecorations from './components/FestiveDecorations';

import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { EasterEggProvider } from './context/EasterEggContext';

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
  
  // Création du thème basé sur le mode
  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    return {
      palette: {
        mode,
        primary: {
          main: '#c62828',
          light: '#ff5f52',
          dark: '#8e0000',
          contrastText: '#fff',
        },
        secondary: {
          main: '#2e7d32',
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
          red: '#c62828',
          green: '#2e7d32',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontWeight: 700,
          fontSize: '2.5rem',
          lineHeight: 1.2,
        },
        h2: {
          fontWeight: 600,
          fontSize: '2rem',
          lineHeight: 1.3,
        },
      },
    };
  }, [mode]);
  
  // Styles pour le chargement
  const styles = useMemo(() => ({
    container: { 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default
    },
    heading1: {
      fontFamily: '"Mountains of Christmas", cursive',
      fontWeight: 700,
    },
    heading2: {
      fontFamily: '"Mountains of Christmas", cursive',
      fontWeight: 600,
    }
  }), [theme]);

  // Gestion des ressources externes
  useEffect(() => {
    // Chargement optimisé de la police
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    
    // Application du style de fond optimisé
    const isDark = mode === 'dark';
    document.body.style.background = isDark ? '#0a1a1e' : 'linear-gradient(135deg, #f5f5f5 0%, #f0f0f0 100%)';
    document.documentElement.style.setProperty('--bg-color', isDark ? '#0a1a1e' : '#f5f5f5');
    
    // Ajout de la police au DOM
    document.head.appendChild(link);
    
    // Nettoyage
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, [mode]);

  // Création du thème mémorisé
  const currentTheme = useMemo(() => createTheme(theme), [theme]);

  return (
    <ThemeProvider theme={currentTheme}>
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
      <Suspense fallback={<LoadingFallback />}>
        <Navbar style={{ position: 'relative', zIndex: 10 }} />
        <main style={{ 
          padding: '20px', 
          position: 'relative', 
          zIndex: 2,
          minHeight: 'calc(100vh - 100px)',
          backgroundColor: theme.palette.background.default
        }}>
          {children}
        </main>
        <SnakeGameWrapper />
      </Suspense>
    </ThemeProvider>
  );
}

// Composant App optimisé avec React.memo
const App = () => {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <NotificationProvider>
          <EasterEggProvider>
            <ThemedApp>
              <Routes>
                {/* Routes Publiques */}
                <Route path="/login" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <LoginPage />
                  </Suspense>
                } />
                <Route path="/register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <RegisterPage />
                  </Suspense>
                } />
                
                {/* Routes Protégées */}
                <Route path="/ventes" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <SalesPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/ventes-entreprises" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <CorporateSalesPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/stocks" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <StockPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/recettes" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <RecipePage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/absences" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <AbsencePage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/comptabilite" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <MaComptabilitePage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/easter-eggs" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <EasterEggsPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute adminOnly={true}>
                    <Suspense fallback={<LoadingFallback />}>
                      <AdminPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                
                {/* Route par défaut */}
                <Route path="/" element={<Navigate to="/ventes" replace />} />
                
                {/* Route 404 */}
                <Route path="*" element={<Navigate to="/ventes" replace />} />
              </Routes>
            </ThemedApp>
          </EasterEggProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
};

// Ajout du displayName pour le débogage
App.displayName = 'App';

export default App;