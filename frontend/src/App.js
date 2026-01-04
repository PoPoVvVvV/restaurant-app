import React, { useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';

import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { EasterEggProvider, useEasterEgg } from './context/EasterEggContext';
// ProtectedRoute et PublicRoute ne doivent pas être lazy loaded car ils utilisent le contexte d'authentification
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

// Composants UI
const Navbar = lazy(() => import('./components/Navbar'));
const SnakeGameWrapper = lazy(() => import('./components/SnakeGameWrapper'));

// Pages (lazy loaded avec prefetch)
const withLazy = (importFn) => {
  const Component = lazy(importFn);
  Component.preload = importFn;
  return Component;
};

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
const ExpenseNotePage = withLazy(() => import('./pages/ExpenseNotePage'));

// Composant de chargement
const LoadingFallback = React.memo(() => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh' 
  }}>
    <CircularProgress />
  </div>
));

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
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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
              background: mode === 'dark' ? '#1565c0' : '#1976d2',
            },
            containedSecondary: {
              background: mode === 'dark' ? '#2e7d32' : '#2e7d32',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
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

  // Configuration du thème par défaut
  React.useEffect(() => {
    document.body.style.background = mode === 'dark' ? '#121212' : '#f5f5f5';
  }, [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <EasterEggProvider>
          <Suspense fallback={null}>
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
                  <Route path="/notes-de-frais" element={<ProtectedRoute><ExpenseNotePage /></ProtectedRoute>} />
                  <Route path="/easter-eggs" element={<ProtectedRoute><EasterEggsPage /></ProtectedRoute>} />
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  } />   
                  {/* Route par défaut */}
                  <Route path="/" element={<Navigate to="/ventes" />} />
                </Routes>
              </Suspense>
            </main>
            <SnakeGameWrapper />
          </Suspense>
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