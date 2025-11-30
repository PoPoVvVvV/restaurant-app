import React, { createContext, useState, useContext, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';
import CustomAlert from '../components/CustomAlert';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  // État pour les notifications toast
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success', 'error', 'warning', 'info'
  });

  // État pour les modales d'alerte
  const [alert, setAlert] = useState({
    open: false,
    title: '',
    message: '',
    severity: 'info', // 'success', 'error', 'warning', 'info'
  });

  // Afficher une notification toast (comportement précédent)
  const showNotification = useCallback((message, severity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  // Afficher une modale d'alerte
  const showAlert = useCallback((message, options = {}) => {
    setAlert({
      open: true,
      message,
      title: options.title || '',
      severity: options.severity || 'info',
    });
  }, []);

  // Confirmation avec promesse
  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setAlert({
        open: true,
        message,
        title: options.title || 'Confirmation',
        severity: options.severity || 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
        showCancelButton: true,
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
      });
    });
  }, []);

  const handleToastClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleAlertClose = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };

  return (
    <NotificationContext.Provider value={{ 
      showNotification, 
      showAlert,
      confirm,
      // Rétrocompatibilité
      showError: (message) => showAlert(message, { severity: 'error' }),
      showSuccess: (message) => showAlert(message, { severity: 'success' }),
      showWarning: (message) => showAlert(message, { severity: 'warning' }),
      showInfo: (message) => showAlert(message, { severity: 'info' })
    }}>
      {children}
      
      {/* Notification toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleToastClose} 
          severity={toast.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Modale d'alerte */}
      <CustomAlert
        open={alert.open}
        onClose={handleAlertClose}
        title={alert.title}
        message={alert.message}
        severity={alert.severity}
      />
    </NotificationContext.Provider>
  );
};

// Hook personnalisé pour utiliser facilement le contexte
export const useNotification = () => {
  return useContext(NotificationContext);
};