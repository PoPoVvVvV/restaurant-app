import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Création de la racine de l'application
const container = document.getElementById('root');
const root = createRoot(container);

// Rendu de l'application avec le routeur
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Enregistrement des métriques de performance
if (process.env.NODE_ENV === 'production') {
  reportWebVitals();
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
