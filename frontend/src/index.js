import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { SnackbarProvider } from 'notistack';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Création du cache Emotion pour les styles
const cache = createCache({
  key: 'css',
  prepend: true,
  // Désactive la propriété de compatibilité pour améliorer les performances
  // en mode développement
  ...(process.env.NODE_ENV === 'development' && {
    stylisPlugins: [],
  }),
});

// Désactive les avertissements de dépréciation en production
if (process.env.NODE_ENV === 'production') {
  console.warn = () => {};
  console.error = () => {};
}

// Création de la racine de l'application
const container = document.getElementById('root');
const root = createRoot(container);

// Fonction pour mesurer les performances
const sendToAnalytics = ({ id, name, value }) => {
  // Envoyer les métriques à votre outil d'analyse
  console.log('Web Vitals:', { id, name, value });
};

// Rendu de l'application avec les fournisseurs optimisés
root.render(
  <React.StrictMode>
    <CacheProvider value={cache}>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              autoHideDuration={3000}
            >
              <App />
            </SnackbarProvider>
          </ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </CacheProvider>
  </React.StrictMode>
);

// Enregistrement des métriques de performance
if (process.env.NODE_ENV === 'production') {
  reportWebVitals(sendToAnalytics);
} else {
  // En développement, on peut afficher les métriques dans la console
  reportWebVitals(console.log);
}

// Activation du cache API pour les requêtes réseau
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.error('ServiceWorker registration failed: ', err);
      });
  });
}

// Optimisation pour les appareils mobiles
if ('connection' in navigator) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    // Réduire la qualité des images sur les connexions lentes
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      document.documentElement.classList.add('slow-connection');
    }
    
    // Mettre à jour la classe en fonction des changements de connexion
    connection.addEventListener('change', () => {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        document.documentElement.classList.add('slow-connection');
      } else {
        document.documentElement.classList.remove('slow-connection');
      }
    });
  }
}
