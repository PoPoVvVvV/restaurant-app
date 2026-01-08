import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Gestion d'erreur globale pour les erreurs non capturées
window.addEventListener('error', (event) => {
  console.error('Erreur globale capturée:', event.error);
  // Empêcher l'affichage de l'erreur dans la console du navigateur si nécessaire
  // event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée non gérée:', event.reason);
  // Empêcher l'affichage de l'erreur dans la console du navigateur si nécessaire
  // event.preventDefault();
});

// Gestion de compatibilité avec les anciens navigateurs
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément root introuvable');
}

try {
  // Utiliser la nouvelle API React 18+
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Erreur lors du rendu de l\'application:', error);
  // Afficher un message d'erreur à l'utilisateur
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>Erreur de chargement</h1>
      <p>L'application n'a pas pu se charger. Veuillez rafraîchir la page.</p>
      <p style="color: #666; font-size: 12px; margin-top: 10px;">Erreur: ${error.message}</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; cursor: pointer; background: #6366f1; color: white; border: none; border-radius: 4px;">
        Rafraîchir
      </button>
    </div>
  `;
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if (typeof reportWebVitals === 'function') {
  reportWebVitals();
}
