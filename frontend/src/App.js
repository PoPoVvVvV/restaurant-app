import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider } from './context/AuthContext';
import { ThemeContextProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SalesPage from './pages/SalesPage';
import StockPage from './pages/StockPage';
import MaComptabilitePage from './pages/MaComptabilitePage';
import AdminPage from './pages/AdminPage';
import RecipePage from './pages/RecipePage';
import CorporateSalesPage from './pages/CorporateSalesPage';

function AppContent({ theme, mode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar mode={mode} />
        <main style={{ padding: '20px' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/ventes" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
            <Route path="/ventes-entreprises" element={<ProtectedRoute adminOnly={true}><CorporateSalesPage /></ProtectedRoute>} />
            <Route path="/stocks" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
            <Route path="/recettes" element={<ProtectedRoute><RecipePage /></ProtectedRoute>} />
            <Route path="/comptabilite" element={<ProtectedRoute><MaComptabilitePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPage /></ProtectedRoute>} />
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
      <ThemeContextProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </ThemeContextProvider>
    </AuthProvider>
  );
}

export default App;