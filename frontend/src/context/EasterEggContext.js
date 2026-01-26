import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  const [isEasterEggUnlocked, setIsEasterEggUnlocked] = useState(() => {
    // Vérifier si l'easter-egg a déjà été débloqué (stocké dans localStorage)
    return localStorage.getItem('easterEggUnlocked') === 'true';
  });
  const [isFlappyBirdUnlocked, setIsFlappyBirdUnlocked] = useState(false);
  const [showSnakeGame, setShowSnakeGame] = useState(false);
  const [showFlappyBird, setShowFlappyBird] = useState(false);
  const [isTetrisUnlocked, setIsTetrisUnlocked] = useState(() => {
    return localStorage.getItem('tetrisUnlocked') === 'true';
  });
  const [showTetrisGame, setShowTetrisGame] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const checkSequenceRef = useRef(null);
  const triggerEasterEggEffectRef = useRef(null);

  // Fonction pour vérifier le déblocage du Flappy Bird
  const checkFlappyBirdUnlock = useCallback(async () => {
    try {
      const response = await api.get('/easter-egg-scores/check-unlock/flappy-bird');
      console.log('[DEBUG] Réponse déblocage Flappy Bird:', response.data);
      setIsFlappyBirdUnlocked(response.data.isUnlocked);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du déblocage Flappy Bird:', error);
      // En cas d'erreur, garder le déblocage à false
      setIsFlappyBirdUnlocked(false);
      return null;
    }
  }, []);

  // Vérifier le déblocage du Flappy Bird au montage
  useEffect(() => {
    checkFlappyBirdUnlock();
  }, [checkFlappyBirdUnlock]);

  // Fonction pour jouer un son de progression
  const playProgressSound = useCallback((progress) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Plus la progression est élevée, plus le son est magique
      const baseFreq = 220; // Fréquence de base (La grave)
      const frequency = baseFreq * Math.pow(1.5, progress); // Progression harmonique
      
      // Créer une mélodie ascendante
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.2, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, audioContext.currentTime + 0.2);
      
      // Volume qui augmente avec la progression (très réduit)
      const volume = 0.01 + (progress * 0.005);
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      // Durée qui augmente avec la progression
      const duration = 0.2 + (progress * 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.log('Audio non supporté pour le son de progression');
    }
  }, []);

  // Fonction pour enregistrer un clic
  const recordClick = useCallback((clickType) => {
    // Si l'easter-egg est déjà débloqué, ne plus jouer de sons ni détecter de séquence
    if (isEasterEggUnlocked) {
      return;
    }

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
      checkSequenceRef.current?.(recentSequence);
    } else {
      checkSequenceRef.current?.(currentSequence);
    }

    // Jouer un son de progression si c'est un bon clic
    const currentProgress = Math.min(currentSequence.length, EXPECTED_SEQUENCE.length);
    const expectedAtThisPosition = EXPECTED_SEQUENCE[currentSequence.length - 1];
    
    if (clickType === expectedAtThisPosition) {
      // C'est un bon clic ! Jouer un son de progression
      playProgressSound(currentProgress);
    }
  }, [clickSequence, lastClickTime, playProgressSound, isEasterEggUnlocked]);

  // Vérifier si la séquence correspond
  const checkSequence = useCallback((sequence) => {
    if (sequence.length === EXPECTED_SEQUENCE.length) {
      const isMatch = sequence.every((click, index) => click === EXPECTED_SEQUENCE[index]);
      if (isMatch && !isEasterEggUnlocked) {
        setIsEasterEggUnlocked(true);
        // Sauvegarder dans localStorage pour rendre permanent
        localStorage.setItem('easterEggUnlocked', 'true');
        // Effet visuel et sonore
        triggerEasterEggEffectRef.current?.();
      }
    }
  }, [isEasterEggUnlocked]);

  useEffect(() => {
    checkSequenceRef.current = checkSequence;
  }, [checkSequence]);

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

    // Son de déblocage magique (utilise l'API Web Audio)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Créer une mélodie magique complexe
      const createMagicalSound = (startTime, frequency, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Mélodie ascendante magique
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, startTime + duration * 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, startTime + duration * 0.6);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 3, startTime + duration * 0.9);
        
        // Enveloppe de volume magique (réduit)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.05, startTime + duration * 0.1);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + duration * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Jouer une séquence de sons magiques
      createMagicalSound(audioContext.currentTime, 220, 0.3); // Do grave
      createMagicalSound(audioContext.currentTime + 0.1, 330, 0.3); // Mi
      createMagicalSound(audioContext.currentTime + 0.2, 440, 0.3); // La
      createMagicalSound(audioContext.currentTime + 0.3, 660, 0.4); // Mi aigu
      createMagicalSound(audioContext.currentTime + 0.4, 880, 0.5); // La aigu
      
    } catch (error) {
      console.log('Audio non supporté pour le son magique');
    }

    // Afficher le jeu après un court délai
    setTimeout(() => {
      setShowSnakeGame(true);
    }, 1000);
  }, []);

  useEffect(() => {
    triggerEasterEggEffectRef.current = triggerEasterEggEffect;
  }, [triggerEasterEggEffect]);

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

  // Ouvrir le jeu Flappy Bird
  const openFlappyBird = useCallback(() => {
    if (isFlappyBirdUnlocked) {
      setShowFlappyBird(true);
    }
  }, [isFlappyBirdUnlocked]);

  // Fermer le jeu Flappy Bird
  const closeFlappyBird = useCallback(() => {
    setShowFlappyBird(false);
  }, []);

  // Débloquer Tetris (à appeler après validation du quiz)
  const unlockTetris = useCallback(() => {
    setIsTetrisUnlocked(true);
    localStorage.setItem('tetrisUnlocked', 'true');
  }, []);

  // Ouvrir/fermer Tetris
  const openTetrisGame = useCallback(() => {
    if (isTetrisUnlocked) {
      setShowTetrisGame(true);
    }
  }, [isTetrisUnlocked]);

  const closeTetrisGame = useCallback(() => {
    setShowTetrisGame(false);
  }, []);

  // Réinitialiser l'easter-egg (pour les tests)
  const resetEasterEgg = useCallback(() => {
    setClickSequence([]);
    setIsEasterEggUnlocked(false);
    setShowSnakeGame(false);
    setShowFlappyBird(false);
    setIsTetrisUnlocked(false);
    setShowTetrisGame(false);
    setLastClickTime(0);
  }, []);

  const value = {
    clickSequence,
    isEasterEggUnlocked,
    isFlappyBirdUnlocked,
    isTetrisUnlocked,
    showSnakeGame,
    showFlappyBird,
    showTetrisGame,
    recordClick,
    openSnakeGame,
    closeSnakeGame,
    openFlappyBird,
    closeFlappyBird,
    openTetrisGame,
    closeTetrisGame,
    unlockTetris,
    resetEasterEgg,
    checkFlappyBirdUnlock,
  };

  return (
    <EasterEggContext.Provider value={value}>
      {children}
    </EasterEggContext.Provider>
  );
};

export default EasterEggContext;
