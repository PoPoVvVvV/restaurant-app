import React, { useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box, Typography, Button } from '@mui/material';

import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { EasterEggProvider } from './context/EasterEggContext';
// ProtectedRoute et PublicRoute ne doivent pas être lazy loaded car ils utilisent le contexte d'authentification
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Composants UI
const Navbar = lazy(() => import('./components/Navbar'));
const SnakeGameWrapper = lazy(() => import('./components/SnakeGameWrapper'));

// Pages (lazy loaded avec prefetch et gestion d'erreur)
const withLazy = (importFn) => {
  const Component = lazy(() => 
    importFn().catch((error) => {
      console.error('Erreur lors du chargement du composant:', error);
      // Retourner un composant de fallback en cas d'erreur
      return {
        default: () => (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="error">
              Erreur lors du chargement de la page
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Recharger
            </Button>
          </Box>
        )
      };
    })
  );
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
          main: mode === 'dark' ? '#6366f1' : '#4f46e5', // Indigo moderne
          light: mode === 'dark' ? '#818cf8' : '#7c3aed',
          dark: mode === 'dark' ? '#4f46e5' : '#4338ca',
          contrastText: '#fff',
        },
        secondary: {
          main: mode === 'dark' ? '#ec4899' : '#db2777', // Rose moderne
          light: mode === 'dark' ? '#f472b6' : '#f472b6',
          dark: mode === 'dark' ? '#db2777' : '#be185d',
          contrastText: '#fff',
        },
        background: {
          default: mode === 'dark' ? '#0f172a' : '#f8fafc',
          paper: mode === 'dark' 
            ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' 
            : '#ffffff',
        },
        text: {
          primary: mode === 'dark' ? '#f1f5f9' : '#1e293b',
          secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
        },
      },
      typography: {
        fontFamily: '"Inter", "Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontWeight: 700,
          letterSpacing: '-0.02em',
        },
        h2: {
          fontWeight: 700,
          letterSpacing: '-0.02em',
        },
        h3: {
          fontWeight: 600,
          letterSpacing: '-0.01em',
        },
        h4: {
          fontWeight: 600,
        },
        h5: {
          fontWeight: 600,
        },
        h6: {
          fontWeight: 600,
        },
        button: {
          fontWeight: 600,
          letterSpacing: '0.02em',
        },
      },
      shape: {
        borderRadius: 16,
      },
      shadows: [
        'none',
        ...Array(24).fill(null).map((_, i) => {
          if (i === 0) return 'none';
          const opacity = mode === 'dark' ? 0.3 : 0.1;
          const y = Math.min(i * 0.5, 12);
          const blur = Math.min(i * 2, 24);
          return `0 ${y}px ${blur}px rgba(0, 0, 0, ${opacity})`;
        }),
      ],
      components: {
        MuiAppBar: {
          styleOverrides: {
            root: {
              background: mode === 'dark' 
                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(99, 102, 241, 0.25)',
              backdropFilter: 'blur(20px)',
              borderBottom: mode === 'dark' 
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(255, 255, 255, 0.2)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              textTransform: 'none',
              fontWeight: 600,
              padding: '10px 24px',
              fontSize: '0.95rem',
              boxShadow: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: mode === 'dark'
                  ? '0 8px 24px rgba(99, 102, 241, 0.4)'
                  : '0 8px 24px rgba(99, 102, 241, 0.3)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            },
            contained: {
              background: mode === 'dark'
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
              '&:hover': {
                background: mode === 'dark'
                  ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
              },
            },
            outlined: {
              borderWidth: '2px',
              '&:hover': {
                borderWidth: '2px',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 20,
              background: mode === 'dark'
                ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)'
                : '#ffffff',
              backdropFilter: 'blur(20px)',
              boxShadow: mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
                : '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
              border: mode === 'dark'
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-8px) scale(1.02)',
                boxShadow: mode === 'dark'
                  ? '0 16px 48px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
                  : '0 12px 40px rgba(0, 0, 0, 0.12), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              borderRadius: 16,
            },
            elevation1: {
              boxShadow: mode === 'dark'
                ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.06)',
            },
            elevation3: {
              boxShadow: mode === 'dark'
                ? '0 8px 24px rgba(0, 0, 0, 0.3)'
                : '0 8px 24px rgba(0, 0, 0, 0.1)',
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 12,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: mode === 'dark' ? '#6366f1' : '#7c3aed',
                    borderWidth: '2px',
                  },
                },
                '&.Mui-focused': {
                  boxShadow: mode === 'dark'
                    ? '0 0 0 4px rgba(99, 102, 241, 0.2)'
                    : '0 0 0 4px rgba(99, 102, 241, 0.1)',
                },
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              fontWeight: 500,
              fontSize: '0.85rem',
            },
          },
        },
      },
    }),
    [mode]
  );

  // Configuration du thème par défaut avec gradient moderne
  React.useEffect(() => {
    if (mode === 'dark') {
      document.body.style.background = 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 50%, #000000 100%)';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.background = 'radial-gradient(ellipse at top, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }, [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <EasterEggProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Navbar style={{ position: 'relative', zIndex: 10 }} />
            <main style={{ 
              padding: '24px', 
              position: 'relative', 
              zIndex: 2,
              minHeight: 'calc(100vh - 64px)',
              animation: 'fadeIn 0.6s ease-in-out'
            }}>
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
    <ErrorBoundary>
      <AuthProvider>
        <ThemeModeProvider>
          <NotificationProvider>
            <ThemedApp />
          </NotificationProvider>
        </ThemeModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;