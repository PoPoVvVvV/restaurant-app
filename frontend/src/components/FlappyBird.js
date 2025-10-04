import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import api from '../services/api';

const FlappyBird = ({ open, onClose }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bird, setBird] = useState({ x: 50, y: 250, velocity: 0, size: 20 });
  const [pipes, setPipes] = useState([]);
  const [gameSpeed, setGameSpeed] = useState(2);
  const [isJumping, setIsJumping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const GRAVITY = 0.5;
  const JUMP_FORCE = -8;
  const PIPE_WIDTH = 50;
  const PIPE_GAP = 150;
  const PIPE_SPEED = 2;

  // Charger le meilleur score au montage
  useEffect(() => {
    if (open) {
      loadHighScore();
      loadLeaderboard();
    }
  }, [open]);

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

  // Sauvegarder le score
  const saveScore = async (finalScore) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const gameData = {
        pipesPassed: Math.floor(finalScore / 10),
        gameSpeed: gameSpeed,
        finalBirdY: bird.y
      };

      await api.post('/easter-egg-scores', {
        easterEggType: 'flappy-bird',
        score: finalScore,
        level: 1, // Flappy Bird n'a pas de niveaux
        duration: 0, // Pas de durée spécifique
        snakeLength: 0, // Pas applicable pour Flappy Bird
        gameData
      });

      // Recharger le classement
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
    setBird({ x: 50, y: 250, velocity: 0, size: 20 });
    setPipes([]);
    setScore(0);
    setGameSpeed(2);
    setGameState('playing');
  };

  // Gérer le saut
  const jump = useCallback(() => {
    if (gameState === 'playing' && !isJumping) {
      setIsJumping(true);
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
      setTimeout(() => setIsJumping(false), 100);
    }
  }, [gameState, isJumping]);

  // Gérer les touches
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, jump]);

  // Logique du jeu
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      setBird(prev => {
        const newBird = {
          ...prev,
          velocity: prev.velocity + GRAVITY,
          y: prev.y + prev.velocity
        };

        // Vérifier les collisions avec le sol et le plafond
        if (newBird.y + newBird.size > 400 || newBird.y < 0) {
          setGameState('gameOver');
          if (score > highScore) {
            setHighScore(score);
            saveScore(score);
          }
          return prev;
        }

        return newBird;
      });

      // Mettre à jour les tuyaux
      setPipes(prev => {
        let newPipes = prev.map(pipe => ({
          ...pipe,
          x: pipe.x - PIPE_SPEED
        })).filter(pipe => pipe.x + PIPE_WIDTH > 0);

        // Ajouter de nouveaux tuyaux
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < 200) {
          const pipeHeight = Math.random() * (300 - PIPE_GAP) + 50;
          newPipes.push({
            x: 400,
            topHeight: pipeHeight,
            bottomY: pipeHeight + PIPE_GAP,
            passed: false
          });
        }

        // Vérifier les collisions avec les tuyaux
        newPipes.forEach(pipe => {
          if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
            pipe.passed = true;
            setScore(prev => prev + 10);
            setGameSpeed(prev => Math.min(prev + 0.1, 4));
          }

          // Collision avec les tuyaux
          if (bird.x + bird.size > pipe.x && 
              bird.x < pipe.x + PIPE_WIDTH && 
              (bird.y < pipe.topHeight || bird.y + bird.size > pipe.bottomY)) {
            setGameState('gameOver');
            if (score > highScore) {
              setHighScore(score);
              saveScore(score);
            }
          }
        });

        return newPipes;
      });
    };

    gameLoopRef.current = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(gameLoopRef.current);
  }, [gameState, bird.x, bird.y, bird.size, score, highScore]);

  // Dessiner le jeu
  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const draw = () => {
      // Effacer le canvas
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, 400, 400);

      if (gameState === 'menu') {
        // Dessiner le menu
        ctx.fillStyle = '#000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Flappy Bird', 200, 150);
        
        ctx.font = '16px Arial';
        ctx.fillText('Appuyez sur ESPACE pour jouer', 200, 200);
        ctx.fillText(`Meilleur score: ${highScore}`, 200, 250);
        
        // Dessiner l'oiseau
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(bird.x, bird.y, bird.size, bird.size);
      } else if (gameState === 'playing' || gameState === 'gameOver') {
        // Dessiner les tuyaux
        ctx.fillStyle = '#228B22';
        pipes.forEach(pipe => {
          ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
          ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, 400 - pipe.bottomY);
        });

        // Dessiner l'oiseau
        ctx.fillStyle = gameState === 'gameOver' ? '#FF0000' : '#FFD700';
        ctx.fillRect(bird.x, bird.y, bird.size, bird.size);

        // Dessiner le score
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Score: ${score}`, 200, 50);

        if (gameState === 'gameOver') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, 0, 400, 400);
          
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 24px Arial';
          ctx.fillText('Game Over!', 200, 180);
          ctx.font = '16px Arial';
          ctx.fillText(`Score final: ${score}`, 200, 220);
          ctx.fillText('Appuyez sur R pour rejouer', 200, 260);
        }
      }
    };

    const animationLoop = () => {
      draw();
      requestAnimationFrame(animationLoop);
    };
    animationLoop();
  }, [open, gameState, bird, pipes, score, highScore]);

  // Gérer la fermeture
  const handleClose = () => {
    setGameState('menu');
    setScore(0);
    setBird({ x: 50, y: 250, velocity: 0, size: 20 });
    setPipes([]);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          color: '#fff',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontFamily: '"Courier New", monospace'
      }}>
        🐦 Flappy Bird
        <Box>
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
        {showLeaderboard ? (
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
              width={400}
              height={400}
              style={{
                border: '2px solid #00ff00',
                borderRadius: '8px',
                backgroundColor: '#87CEEB',
                cursor: 'pointer'
              }}
              onClick={gameState === 'menu' ? initGame : jump}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontFamily: '"Courier New", monospace', mb: 1 }}>
                {gameState === 'menu' && 'Cliquez sur le jeu pour commencer'}
                {gameState === 'playing' && 'Appuyez sur ESPACE ou cliquez pour sauter'}
                {gameState === 'gameOver' && 'Appuyez sur R pour rejouer'}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                <Chip 
                  label={`Score: ${score}`} 
                  sx={{ 
                    backgroundColor: '#00ff00', 
                    color: '#000',
                    fontFamily: '"Courier New", monospace'
                  }}
                />
                <Chip 
                  label={`Meilleur: ${highScore}`} 
                  sx={{ 
                    backgroundColor: '#000', 
                    color: '#00ff00',
                    fontFamily: '"Courier New", monospace'
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
        {!showLeaderboard && (
          <>
            <Button
              onClick={initGame}
              startIcon={<RestartAltIcon />}
              sx={{
                backgroundColor: '#00ff00',
                color: '#000',
                fontFamily: '"Courier New", monospace',
                '&:hover': {
                  backgroundColor: '#00cc00'
                }
              }}
            >
              {gameState === 'menu' ? 'Jouer' : 'Rejouer'}
            </Button>
          </>
        )}
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

