import React, { useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SalesPage from './pages/SalesPage';
import StockPage from './pages/StockPage';
import MaComptabilitePage from './pages/MaComptabilitePage';
import AdminPage from './pages/AdminPage';
import RecipePage from './pages/RecipePage';
import CorporateSalesPage from './pages/CorporateSalesPage';
import AbsencePage from './pages/AbsencePage'; // Importer la page des absences

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
          <Routes>
            {/* Routes Publiques */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            
            {/* Routes Protégées */}
            <Route path="/ventes" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
            <Route path="/ventes-entreprises" element={<ProtectedRoute><CorporateSalesPage /></ProtectedRoute>} />
            <Route path="/stocks" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
            <Route path="/recettes" element={<ProtectedRoute><RecipePage /></ProtectedRoute>} />
            <Route path="/absences" element={<ProtectedRoute><AbsencePage /></ProtectedRoute>} /> {/* AJOUTER */}
            <Route path="/comptabilite" element={<ProtectedRoute><MaComptabilitePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPage /></ProtectedRoute>} />
            
            {/* Route par défaut */}
            <Route path="/" element={<Navigate to="/ventes" />} />
          </Routes>
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