import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Paper,
  Chip,
  Slider,
  Switch,
  FormControlLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import api from '../services/api';

const FlappyBird = ({ open, onClose }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const particlesRef = useRef([]);
  const audioContextRef = useRef(null);
  
  // États du jeu
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'paused', 'gameOver'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bird, setBird] = useState({ x: 50, y: 250, velocity: 0, size: 20, rotation: 0 });
  const [pipes, setPipes] = useState([]);
  const [gameSpeed, setGameSpeed] = useState(2);
  const [isJumping, setIsJumping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Paramètres optimisés
  const [settings, setSettings] = useState({
    soundEnabled: true,
    particlesEnabled: true,
    smoothGraphics: true,
    difficulty: 'normal', // 'easy', 'normal', 'hard', 'extreme'
    fps: 60
  });
  
  // Constantes optimisées
  const GAME_CONFIG = useMemo(() => ({
    GRAVITY: 0.6,
    JUMP_FORCE: -9,
    PIPE_WIDTH: 60,
    PIPE_GAP: 160,
    PIPE_SPEED: 3,
    BIRD_SIZE: 24,
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    GROUND_HEIGHT: 50,
    SKY_HEIGHT: 450,
    DIFFICULTY: {
      easy: { gravity: 0.4, jumpForce: -7, pipeGap: 180, pipeSpeed: 2 },
      normal: { gravity: 0.6, jumpForce: -9, pipeGap: 160, pipeSpeed: 3 },
      hard: { gravity: 0.8, jumpForce: -11, pipeGap: 140, pipeSpeed: 4 },
      extreme: { gravity: 1.0, jumpForce: -13, pipeGap: 120, pipeSpeed: 5 }
    }
  }), []);

  // Initialiser l'audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current && settings.soundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.log('Audio non supporté');
      }
    }
  }, [settings.soundEnabled]);

  // Jouer un son
  const playSound = useCallback((frequency, duration, type = 'sine') => {
    if (!settings.soundEnabled || !audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.log('Erreur audio:', error);
    }
  }, [settings.soundEnabled]);

  // Charger le meilleur score au montage
  useEffect(() => {
    if (open) {
      loadHighScore();
      loadLeaderboard();
      initAudio();
    }
  }, [open, initAudio]);

  // Charger le meilleur score de l'utilisateur
  const loadHighScore = async () => {
    try {
      const response = await api.get('/easter-egg-scores/my-best/flappy-bird');
      if (response.data.bestScore) {
        setHighScore(response.data.bestScore.score);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du meilleur score:', error);
    }
  };

  // Charger le classement
  const loadLeaderboard = async () => {
    try {
      const response = await api.get('/easter-egg-scores/leaderboard/flappy-bird?limit=10');
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Erreur lors du chargement du classement:', error);
    }
  };

  // Sauvegarder le score (ne garde que le meilleur)
  const saveScore = async (finalScore) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const gameData = {
        pipesPassed: Math.floor(finalScore / 10),
        gameSpeed: gameSpeed,
        finalBirdY: bird.y,
        difficulty: settings.difficulty,
        settings: settings,
        timestamp: new Date().toISOString()
      };

      const response = await api.post('/easter-egg-scores', {
        easterEggType: 'flappy-bird',
        score: finalScore,
        level: 1,
        duration: 0,
        snakeLength: 0,
        gameData
      });

      // Vérifier si c'est un nouveau record
      if (response.data.isNewRecord) {
        console.log('🎉 Nouveau record personnel !', finalScore);
        setHighScore(finalScore); // Mettre à jour immédiatement le high score local
        playSound(800, 0.3, 'sine'); // Son de record
      } else if (response.data.isScoreRejected) {
        console.log('📊 Score non sauvegardé (inférieur au meilleur)', finalScore);
        playSound(400, 0.2, 'triangle'); // Son de score normal
      }

      // Recharger les données
      loadLeaderboard();
      loadHighScore();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du score:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Initialiser le jeu
  const initGame = () => {
    const config = GAME_CONFIG.DIFFICULTY[settings.difficulty];
    setBird({ 
      x: 80, 
      y: GAME_CONFIG.SKY_HEIGHT / 2, 
      velocity: 0, 
      size: GAME_CONFIG.BIRD_SIZE,
      rotation: 0
    });
    setPipes([]);
    setScore(0);
    setGameSpeed(config.pipeSpeed);
    setGameState('playing');
    particlesRef.current = [];
    playSound(440, 0.1); // Son de démarrage
  };

  // Gérer le saut optimisé
  const jump = useCallback(() => {
    if (gameState === 'playing' && !isJumping) {
      setIsJumping(true);
      const config = GAME_CONFIG.DIFFICULTY[settings.difficulty];
      setBird(prev => ({ 
        ...prev, 
        velocity: config.jumpForce,
        rotation: -20 // Rotation vers le haut
      }));
      
      // Effet de particules
      if (settings.particlesEnabled) {
        particlesRef.current.push({
          x: bird.x + bird.size / 2,
          y: bird.y + bird.size,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2 + 1,
          life: 30,
          maxLife: 30,
          color: `hsl(${60 + Math.random() * 60}, 100%, 50%)`
        });
      }
      
      playSound(800 + Math.random() * 200, 0.1, 'square');
      setTimeout(() => setIsJumping(false), 80);
    }
  }, [gameState, isJumping, bird.x, bird.y, bird.size, settings.difficulty, settings.particlesEnabled, playSound]);

  // Gérer les touches optimisées
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      } else if (e.code === 'KeyP' && gameState === 'playing') {
        e.preventDefault();
        setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
      } else if (e.code === 'KeyR' && gameState === 'gameOver') {
        e.preventDefault();
        initGame();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, jump, gameState]);

  // Logique du jeu optimisée
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      const config = GAME_CONFIG.DIFFICULTY[settings.difficulty];
      
      setBird(prev => {
        const newBird = {
          ...prev,
          velocity: prev.velocity + config.gravity,
          y: prev.y + prev.velocity,
          rotation: Math.min(Math.max(prev.velocity * 2, -45), 45)
        };

        // Vérifier les collisions avec le sol et le plafond
        if (newBird.y + newBird.size > GAME_CONFIG.SKY_HEIGHT || newBird.y < 0) {
          setGameState('gameOver');
          playSound(150, 0.5, 'sawtooth');
          // Toujours essayer de sauvegarder (le backend gérera si c'est un nouveau record)
            saveScore(score);
          return prev;
        }

        return newBird;
      });

      setPipes(prev => {
        let newPipes = prev.map(pipe => ({
          ...pipe,
          x: pipe.x - config.pipeSpeed
        })).filter(pipe => pipe.x + GAME_CONFIG.PIPE_WIDTH > 0);

        // Ajouter de nouveaux tuyaux
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < 300) {
          const pipeHeight = Math.random() * (GAME_CONFIG.SKY_HEIGHT - config.pipeGap - 100) + 50;
          newPipes.push({
            x: GAME_CONFIG.CANVAS_WIDTH,
            topHeight: pipeHeight,
            bottomY: pipeHeight + config.pipeGap,
            passed: false,
            id: Date.now() + Math.random()
          });
        }

        return newPipes;
      });

      // Mettre à jour les particules
      if (settings.particlesEnabled) {
        particlesRef.current = particlesRef.current
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 1,
            vy: particle.vy + 0.2
          }))
          .filter(particle => particle.life > 0);
      }
    };

    gameLoopRef.current = setInterval(gameLoop, 1000 / 60);
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, settings.difficulty, settings.particlesEnabled, playSound]);

  // Vérification des collisions séparée
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkCollisions = () => {
      const birdLeft = bird.x;
      const birdRight = bird.x + bird.size;
      const birdTop = bird.y;
      const birdBottom = bird.y + bird.size;

      pipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + GAME_CONFIG.PIPE_WIDTH < birdLeft) {
            pipe.passed = true;
          setScore(prev => {
            const newScore = prev + 10;
            playSound(600 + newScore * 2, 0.1, 'triangle');
            return newScore;
          });
          setGameSpeed(prev => Math.min(prev + 0.05, 6));
        }

        if (birdRight > pipe.x && 
            birdLeft < pipe.x + GAME_CONFIG.PIPE_WIDTH && 
            (birdTop < pipe.topHeight || birdBottom > pipe.bottomY)) {
          setGameState('gameOver');
          playSound(150, 0.5, 'sawtooth');
          // Toujours essayer de sauvegarder (le backend gérera si c'est un nouveau record)
          saveScore(score);
        }
      });
    };

    const collisionInterval = setInterval(checkCollisions, 1000 / 60);
    return () => clearInterval(collisionInterval);
  }, [gameState, bird, pipes, score, highScore, playSound]);

  // Dessiner le jeu optimisé
  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Optimisation du rendu
    ctx.imageSmoothingEnabled = settings.smoothGraphics;
    ctx.imageSmoothingQuality = 'high';

    const draw = () => {
      // Effacer le canvas avec dégradé
      const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#98FB98');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

      if (gameState === 'menu') {
        // Dessiner le menu avec style amélioré
        ctx.fillStyle = '#2C3E50';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeText('🐦 Flappy Bird Ultra', GAME_CONFIG.CANVAS_WIDTH / 2, 120);
        ctx.fillText('🐦 Flappy Bird Ultra', GAME_CONFIG.CANVAS_WIDTH / 2, 120);
        
        ctx.font = '18px Arial';
        ctx.fillStyle = '#34495E';
        ctx.fillText('Appuyez sur ESPACE pour jouer', GAME_CONFIG.CANVAS_WIDTH / 2, 180);
        ctx.fillText(`Meilleur score: ${highScore}`, GAME_CONFIG.CANVAS_WIDTH / 2, 220);
        ctx.fillText(`Difficulté: ${settings.difficulty.toUpperCase()}`, GAME_CONFIG.CANVAS_WIDTH / 2, 260);
        
        // Dessiner l'oiseau animé
        drawBird(ctx, bird.x, bird.y, bird.rotation, true);
      } else if (gameState === 'playing' || gameState === 'paused' || gameState === 'gameOver') {
        // Dessiner les tuyaux avec style amélioré
        drawPipes(ctx, pipes);
        
        // Dessiner l'oiseau
        drawBird(ctx, bird.x, bird.y, bird.rotation, gameState === 'gameOver');
        
        // Dessiner les particules
        if (settings.particlesEnabled) {
          drawParticles(ctx);
        }

        // Dessiner le score avec style
        drawScore(ctx, score, highScore);

        // Dessiner le sol
        drawGround(ctx);

        if (gameState === 'paused') {
          drawPauseOverlay(ctx);
        } else if (gameState === 'gameOver') {
          drawGameOverOverlay(ctx);
        }
      }
    };

    // Rendu unique au lieu d'une boucle infinie
      draw();
  }, [open, gameState, bird, pipes, score, highScore, settings.difficulty, settings.smoothGraphics, settings.particlesEnabled]);

  // Rendu optimisé pour le jeu en cours
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const render = () => {
      // Effacer le canvas avec dégradé
      const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#98FB98');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

      // Dessiner les tuyaux
      drawPipes(ctx, pipes);
      
      // Dessiner l'oiseau
      drawBird(ctx, bird.x, bird.y, bird.rotation, false);
      
      // Dessiner les particules
      if (settings.particlesEnabled) {
        drawParticles(ctx);
      }

      // Dessiner le score
      drawScore(ctx, score, highScore);

      // Dessiner le sol
      drawGround(ctx);
    };

    // Rendu immédiat
    render();
    
    // Rendu périodique seulement si nécessaire
    const renderInterval = setInterval(render, 1000 / 60);
    
    return () => {
      clearInterval(renderInterval);
    };
  }, [gameState, bird, pipes, score, highScore, settings.particlesEnabled]);

  // Fonction pour dessiner l'oiseau optimisée
  const drawBird = (ctx, x, y, rotation, isDead = false) => {
    ctx.save();
    ctx.translate(x + GAME_CONFIG.BIRD_SIZE / 2, y + GAME_CONFIG.BIRD_SIZE / 2);
    ctx.rotate(rotation * Math.PI / 180);
    
    // Corps de l'oiseau avec dégradé
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, GAME_CONFIG.BIRD_SIZE / 2);
    gradient.addColorStop(0, isDead ? '#FF6B6B' : '#FFD700');
    gradient.addColorStop(1, isDead ? '#E74C3C' : '#F39C12');
    ctx.fillStyle = gradient;
    
    // Dessiner l'oiseau comme un cercle
    ctx.beginPath();
    ctx.arc(0, 0, GAME_CONFIG.BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Œil
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-3, -3, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-2, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Bec
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(GAME_CONFIG.BIRD_SIZE / 2 - 2, 0);
    ctx.lineTo(GAME_CONFIG.BIRD_SIZE / 2 + 4, -2);
    ctx.lineTo(GAME_CONFIG.BIRD_SIZE / 2 + 4, 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  };

  // Fonction pour dessiner les tuyaux
  const drawPipes = (ctx, pipes) => {
    pipes.forEach(pipe => {
      // Tuyau du haut
      const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + GAME_CONFIG.PIPE_WIDTH, 0);
      topGradient.addColorStop(0, '#27AE60');
      topGradient.addColorStop(1, '#2ECC71');
      ctx.fillStyle = topGradient;
      ctx.fillRect(pipe.x, 0, GAME_CONFIG.PIPE_WIDTH, pipe.topHeight);
      
      // Bordure du tuyau du haut
      ctx.strokeStyle = '#1E8449';
      ctx.lineWidth = 3;
      ctx.strokeRect(pipe.x, 0, GAME_CONFIG.PIPE_WIDTH, pipe.topHeight);
      
      // Tuyau du bas
      ctx.fillStyle = topGradient;
      ctx.fillRect(pipe.x, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH, GAME_CONFIG.SKY_HEIGHT - pipe.bottomY);
      
      // Bordure du tuyau du bas
      ctx.strokeRect(pipe.x, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH, GAME_CONFIG.SKY_HEIGHT - pipe.bottomY);
    });
  };

  // Fonction pour dessiner les particules
  const drawParticles = (ctx) => {
    particlesRef.current.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  // Fonction pour dessiner le score
  const drawScore = (ctx, score, highScore) => {
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.strokeText(score.toString(), GAME_CONFIG.CANVAS_WIDTH / 2, 60);
    ctx.fillText(score.toString(), GAME_CONFIG.CANVAS_WIDTH / 2, 60);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = '#7F8C8D';
    ctx.fillText(`Meilleur: ${highScore}`, GAME_CONFIG.CANVAS_WIDTH / 2, 90);
  };

  // Fonction pour dessiner le sol
  const drawGround = (ctx) => {
    const gradient = ctx.createLinearGradient(0, GAME_CONFIG.SKY_HEIGHT, 0, GAME_CONFIG.CANVAS_HEIGHT);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(1, '#654321');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, GAME_CONFIG.SKY_HEIGHT, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.GROUND_HEIGHT);
  };

  // Fonction pour dessiner l'overlay de pause
  const drawPauseOverlay = (ctx) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSE', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
    
    ctx.font = '18px Arial';
    ctx.fillText('Appuyez sur P pour reprendre', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 40);
  };

  // Fonction pour dessiner l'overlay de game over
  const drawGameOverOverlay = (ctx) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    
    ctx.fillStyle = '#E74C3C';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeText('GAME OVER!', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 40);
    ctx.fillText('GAME OVER!', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 40);
    
    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`Score final: ${score}`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 10);
    
    // Afficher si c'est un nouveau record
    if (score > highScore) {
      ctx.fillStyle = '#F39C12';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('🎉 NOUVEAU RECORD!', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 15);
    } else if (score === highScore) {
      ctx.fillStyle = '#27AE60';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('✨ ÉGALITÉ!', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 15);
    } else {
      ctx.fillStyle = '#95A5A6';
      ctx.font = '14px Arial';
      ctx.fillText(`Meilleur: ${highScore}`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 15);
    }
    
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.fillText('Appuyez sur R pour rejouer', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 45);
  };

  // Gérer la fermeture
  const handleClose = () => {
    setGameState('menu');
    setScore(0);
    setBird({ x: 80, y: GAME_CONFIG.SKY_HEIGHT / 2, velocity: 0, size: GAME_CONFIG.BIRD_SIZE, rotation: 0 });
    setPipes([]);
    particlesRef.current = [];
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          color: '#fff',
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontFamily: '"Courier New", monospace'
      }}>
        🐦 Flappy Bird Ultra
        <Box>
          <IconButton 
            onClick={() => setShowSettings(!showSettings)}
            sx={{ color: '#00ff00', mr: 1 }}
          >
            <SettingsIcon />
          </IconButton>
          <IconButton 
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            sx={{ color: '#00ff00', mr: 1 }}
          >
            🏆
          </IconButton>
          <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', p: 2 }}>
        {showSettings ? (
          <Box sx={{ maxWidth: 400, mx: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 3, fontFamily: '"Courier New", monospace' }}>
              ⚙️ Paramètres
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                />
              }
              label="🔊 Son"
              sx={{ display: 'block', mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.particlesEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, particlesEnabled: e.target.checked }))}
                />
              }
              label="✨ Particules"
              sx={{ display: 'block', mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.smoothGraphics}
                  onChange={(e) => setSettings(prev => ({ ...prev, smoothGraphics: e.target.checked }))}
                />
              }
              label="🎨 Graphismes lisses"
              sx={{ display: 'block', mb: 3 }}
            />
            
            <Typography sx={{ mb: 2, fontFamily: '"Courier New", monospace' }}>
              Difficulté: {settings.difficulty.toUpperCase()}
            </Typography>
            <Slider
              value={['easy', 'normal', 'hard', 'extreme'].indexOf(settings.difficulty)}
              onChange={(e, value) => {
                const difficulties = ['easy', 'normal', 'hard', 'extreme'];
                setSettings(prev => ({ ...prev, difficulty: difficulties[value] }));
              }}
              min={0}
              max={3}
              step={1}
              marks={[
                { value: 0, label: 'Facile' },
                { value: 1, label: 'Normal' },
                { value: 2, label: 'Difficile' },
                { value: 3, label: 'Extrême' }
              ]}
              sx={{ mb: 3 }}
            />
          </Box>
        ) : showLeaderboard ? (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: '"Courier New", monospace' }}>
              🏆 Classement Flappy Bird
            </Typography>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <Paper 
                  key={index} 
                  sx={{ 
                    p: 1, 
                    mb: 1, 
                    backgroundColor: index < 3 ? '#00ff00' : '#333',
                    color: index < 3 ? '#000' : '#fff'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontFamily: '"Courier New", monospace' }}>
                      #{index + 1} {entry.username}
                    </Typography>
                    <Chip 
                      label={`${entry.score} pts`} 
                      size="small"
                      sx={{ 
                        backgroundColor: index < 3 ? '#000' : '#00ff00',
                        color: index < 3 ? '#00ff00' : '#000',
                        fontFamily: '"Courier New", monospace'
                      }}
                    />
                  </Box>
                </Paper>
              ))
            ) : (
              <Typography sx={{ fontFamily: '"Courier New", monospace' }}>
                Aucun score enregistré
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            <canvas
              ref={canvasRef}
              width={GAME_CONFIG.CANVAS_WIDTH}
              height={GAME_CONFIG.CANVAS_HEIGHT}
              style={{
                border: '3px solid #00ff00',
                borderRadius: '12px',
                backgroundColor: '#87CEEB',
                cursor: gameState === 'menu' ? 'pointer' : 'default',
                boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)'
              }}
              onClick={gameState === 'menu' ? initGame : jump}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontFamily: '"Courier New", monospace', mb: 1 }}>
                {gameState === 'menu' && 'Cliquez sur le jeu pour commencer'}
                {gameState === 'playing' && 'ESPACE/CLIC = Sauter | P = Pause'}
                {gameState === 'paused' && 'P = Reprendre'}
                {gameState === 'gameOver' && 'R = Rejouer'}
              </Typography>
              
              {gameState === 'menu' && (
                <Typography variant="caption" sx={{ 
                  fontFamily: '"Courier New", monospace', 
                  color: '#7F8C8D',
                  display: 'block',
                  mb: 1,
                  maxWidth: 400,
                  mx: 'auto'
                }}>
                  💾 Seul votre meilleur score est sauvegardé automatiquement
                </Typography>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Score: ${score}`} 
                  sx={{ 
                    backgroundColor: '#00ff00', 
                    color: '#000',
                    fontFamily: '"Courier New", monospace',
                    fontWeight: 'bold'
                  }}
                />
                <Chip 
                  label={`Meilleur: ${highScore}`} 
                  sx={{ 
                    backgroundColor: '#000', 
                    color: '#00ff00',
                    fontFamily: '"Courier New", monospace',
                    fontWeight: 'bold'
                  }}
                />
                <Chip 
                  label={`Difficulté: ${settings.difficulty.toUpperCase()}`} 
                  sx={{ 
                    backgroundColor: '#333', 
                    color: '#fff',
                    fontFamily: '"Courier New", monospace'
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
        {!showLeaderboard && !showSettings && (
          <>
            <Button
              onClick={initGame}
              startIcon={<RestartAltIcon />}
              sx={{
                backgroundColor: '#00ff00',
                color: '#000',
                fontFamily: '"Courier New", monospace',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#00cc00'
                }
              }}
            >
              {gameState === 'menu' ? 'Jouer' : 'Rejouer'}
            </Button>
            {gameState === 'playing' && (
              <Button
                onClick={() => setGameState('paused')}
                sx={{
                  backgroundColor: '#f39c12',
                  color: '#000',
                  fontFamily: '"Courier New", monospace',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: '#e67e22'
                  }
                }}
              >
                Pause
              </Button>
            )}
            {gameState === 'paused' && (
              <Button
                onClick={() => setGameState('playing')}
                sx={{
                  backgroundColor: '#27ae60',
                  color: '#fff',
                  fontFamily: '"Courier New", monospace',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: '#229954'
                  }
                }}
              >
                Reprendre
              </Button>
            )}
          </>
        )}
        <Button
          onClick={() => setShowSettings(!showSettings)}
          sx={{
            backgroundColor: '#8e44ad',
            color: '#fff',
            fontFamily: '"Courier New", monospace',
            '&:hover': {
              backgroundColor: '#7d3c98'
            }
          }}
        >
          {showSettings ? 'Retour au jeu' : 'Paramètres'}
        </Button>
        <Button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          sx={{
            backgroundColor: '#333',
            color: '#00ff00',
            fontFamily: '"Courier New", monospace',
            '&:hover': {
              backgroundColor: '#555'
            }
          }}
        >
          {showLeaderboard ? 'Retour au jeu' : 'Classement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlappyBird;