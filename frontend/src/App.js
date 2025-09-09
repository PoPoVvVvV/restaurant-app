import React, { useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';

import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

// Lazy loading des pages pour optimiser les performances
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const MaComptabilitePage = lazy(() => import('./pages/MaComptabilitePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const RecipePage = lazy(() => import('./pages/RecipePage'));
const CorporateSalesPage = lazy(() => import('./pages/CorporateSalesPage'));
const AbsencePage = lazy(() => import('./pages/AbsencePage'));

// Composant de chargement
const LoadingSpinner = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="50vh"
  >
    <CircularProgress />
  </Box>
);

function ThemedApp() {
  const { mode } = useThemeMode();

  const theme = useMemo(
    () => createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar />
        <main style={{ padding: '20px' }}>
          <Suspense fallback={<LoadingSpinner />}>
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
              <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPage /></ProtectedRoute>} />
              
              {/* Route par défaut */}
              <Route path="/" element={<Navigate to="/ventes" />} />
            </Routes>
          </Suspense>
        </main>
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