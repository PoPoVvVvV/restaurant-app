import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const EasterEggContext = createContext();

export const useEasterEgg = () => {
  const context = useContext(EasterEggContext);
  if (!context) {
    throw new Error('useEasterEgg must be used within an EasterEggProvider');
  }
  return context;
};

// Séquence attendue : logo → Ventes → Ma Compta → Recettes → Stocks → Ma Compta
const EXPECTED_SEQUENCE = [
  'logo',
  'ventes', 
  'comptabilite',
  'recettes',
  'stocks',
  'comptabilite'
];

export const EasterEggProvider = ({ children }) => {
  const [clickSequence, setClickSequence] = useState([]);
  const [isEasterEggUnlocked, setIsEasterEggUnlocked] = useState(false);
  const [showSnakeGame, setShowSnakeGame] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Fonction pour enregistrer un clic
  const recordClick = useCallback((clickType) => {
    const now = Date.now();
    
    // Si plus de 10 secondes se sont écoulées, réinitialiser la séquence
    if (now - lastClickTime > 10000) {
      setClickSequence([clickType]);
    } else {
      setClickSequence(prev => [...prev, clickType]);
    }
    
    setLastClickTime(now);
    
    // Vérifier si la séquence correspond
    const currentSequence = [...clickSequence, clickType];
    if (currentSequence.length > EXPECTED_SEQUENCE.length) {
      // Garder seulement les derniers clics
      const recentSequence = currentSequence.slice(-EXPECTED_SEQUENCE.length);
      checkSequence(recentSequence);
    } else {
      checkSequence(currentSequence);
    }
  }, [clickSequence, lastClickTime]);

  // Vérifier si la séquence correspond
  const checkSequence = useCallback((sequence) => {
    if (sequence.length === EXPECTED_SEQUENCE.length) {
      const isMatch = sequence.every((click, index) => click === EXPECTED_SEQUENCE[index]);
      if (isMatch && !isEasterEggUnlocked) {
        setIsEasterEggUnlocked(true);
        // Effet visuel et sonore
        triggerEasterEggEffect();
      }
    }
  }, [isEasterEggUnlocked]);

  // Effet visuel et sonore pour le déblocage
  const triggerEasterEggEffect = useCallback(async () => {
    // Envoyer la notification webhook
    try {
      await api.post('/settings/easter-egg-discovered', {});
      console.log('Notification webhook easter-egg envoyée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification webhook:', error);
      // Ne pas empêcher l'easter-egg de fonctionner si le webhook échoue
    }

    // Effet de confettis ou animation
    const colors = ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        confetti.style.animation = 'confetti-fall 3s linear forwards';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
          if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti);
          }
        }, 3000);
      }, i * 50);
    }

    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.getElementById('confetti-animation')) {
      const style = document.createElement('style');
      style.id = 'confetti-animation';
      style.textContent = `
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Son de déblocage (utilise l'API Web Audio)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio non supporté');
    }

    // Afficher le jeu après un court délai
    setTimeout(() => {
      setShowSnakeGame(true);
    }, 1000);
  }, []);

  // Ouvrir le jeu Snake
  const openSnakeGame = useCallback(() => {
    if (isEasterEggUnlocked) {
      setShowSnakeGame(true);
    }
  }, [isEasterEggUnlocked]);

  // Fermer le jeu Snake
  const closeSnakeGame = useCallback(() => {
    setShowSnakeGame(false);
  }, []);

  // Réinitialiser l'easter-egg (pour les tests)
  const resetEasterEgg = useCallback(() => {
    setClickSequence([]);
    setIsEasterEggUnlocked(false);
    setShowSnakeGame(false);
    setLastClickTime(0);
  }, []);

  const value = {
    clickSequence,
    isEasterEggUnlocked,
    showSnakeGame,
    recordClick,
    openSnakeGame,
    closeSnakeGame,
    resetEasterEgg,
  };

  return (
    <EasterEggContext.Provider value={value}>
      {children}
    </EasterEggContext.Provider>
  );
};

export default EasterEggContext;
