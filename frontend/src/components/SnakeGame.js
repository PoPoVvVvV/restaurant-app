import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../services/api';

// Style rétro pour le jeu
const GameContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  backgroundColor: '#000',
  color: '#00ff00',
  fontFamily: '"Courier New", monospace',
  borderRadius: '8px',
  border: '2px solid #00ff00',
  boxShadow: '0 0 20px #00ff00',
}));

const GameBoard = styled(Box)({
  position: 'relative',
  width: '400px',
  height: '400px',
  backgroundColor: '#000',
  border: '2px solid #00ff00',
  margin: '20px 0',
  overflow: 'hidden',
});

const SnakeSegment = styled(Box)({
  position: 'absolute',
  width: '20px',
  height: '20px',
  backgroundColor: '#00ff00',
  border: '1px solid #000',
});

const Food = styled(Box)({
  position: 'absolute',
  width: '20px',
  height: '20px',
  backgroundColor: '#ff0000',
  borderRadius: '50%',
  border: '1px solid #000',
});

const ScoreDisplay = styled(Typography)({
  color: '#00ff00',
  fontSize: '18px',
  fontFamily: '"Courier New", monospace',
  marginBottom: '10px',
});

const GameOverDisplay = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  padding: '20px',
  borderRadius: '8px',
  border: '2px solid #00ff00',
});

const SnakeGame = ({ open, onClose }) => {
  const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'paused', 'gameOver'
  const [snake, setSnake] = useState([{ x: 200, y: 200 }]);
  const [food, setFood] = useState({ x: 100, y: 100 });
  const [direction, setDirection] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(150);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameDuration, setGameDuration] = useState(0);

  // Générer une position aléatoire pour la nourriture
  const generateFood = useCallback((currentSnake = [{ x: 200, y: 200 }]) => {
    const maxX = Math.floor(400 / 20) - 1;
    const maxY = Math.floor(400 / 20) - 1;
    
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * maxX) * 20,
        y: Math.floor(Math.random() * maxY) * 20,
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    return newFood;
  }, []);

  // Vérifier les collisions
  const checkCollision = useCallback((head, snake) => {
    // Collision avec les murs
    if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400) {
      return true;
    }
    // Collision avec le corps du serpent
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  // Mouvement du serpent
  const moveSnake = useCallback(() => {
    if (gameState !== 'playing' || (direction.x === 0 && direction.y === 0)) return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      
      head.x += direction.x;
      head.y += direction.y;

      // Vérifier les collisions
      if (checkCollision(head, newSnake)) {
        setGameState('gameOver');
        // Calculer la durée de jeu
        if (gameStartTime) {
          setGameDuration(Math.floor((Date.now() - gameStartTime) / 1000));
        }
        return prevSnake;
      }

      newSnake.unshift(head);

      // Vérifier si le serpent mange la nourriture
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        setFood(generateFood(newSnake));
        
        // Augmenter la vitesse progressivement
        setGameSpeed(prev => Math.max(80, prev - 2));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameState, direction, food, checkCollision, generateFood]);

  // Gestion des touches
  const handleKeyPress = useCallback((event) => {
    const key = event.key;
    
    // Gestion de la touche Espace (pause/reprendre) - toujours active
    if (key === ' ') {
      event.preventDefault();
      if (gameState === 'playing') {
        setGameState('paused');
      } else if (gameState === 'paused') {
        setGameState('playing');
      } else if (gameState === 'ready') {
        // Démarrer le jeu directement ici pour éviter la référence circulaire
        const initialSnake = [{ x: 200, y: 200 }];
        setGameState('playing');
        setSnake(initialSnake);
        setDirection({ x: 20, y: 0 });
        setScore(0);
        setGameSpeed(150);
        setFood(generateFood(initialSnake));
        setGameStartTime(Date.now());
        setGameDuration(0);
      }
      return;
    }

    // Gestion des flèches directionnelles - seulement en mode playing
    if (gameState !== 'playing') return;

    switch (key) {
      case 'ArrowUp':
        if (direction.y === 0) setDirection({ x: 0, y: -20 });
        break;
      case 'ArrowDown':
        if (direction.y === 0) setDirection({ x: 0, y: 20 });
        break;
      case 'ArrowLeft':
        if (direction.x === 0) setDirection({ x: -20, y: 0 });
        break;
      case 'ArrowRight':
        if (direction.x === 0) setDirection({ x: 20, y: 0 });
        break;
      default:
        break;
    }
  }, [gameState, direction, generateFood]);

  // Effet pour le mouvement du serpent
  useEffect(() => {
    const gameLoop = setInterval(moveSnake, gameSpeed);
    return () => clearInterval(gameLoop);
  }, [moveSnake, gameSpeed]);

  // Effet pour les événements clavier
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Démarrer le jeu
  const startGame = () => {
    const initialSnake = [{ x: 200, y: 200 }];
    setGameState('playing');
    setSnake(initialSnake);
    setDirection({ x: 20, y: 0 }); // Commencer en se déplaçant vers la droite
    setScore(0);
    setGameSpeed(150);
    setFood(generateFood(initialSnake));
    setGameStartTime(Date.now());
    setGameDuration(0);
  };

  // Redémarrer le jeu
  const restartGame = () => {
    const initialSnake = [{ x: 200, y: 200 }];
    setGameState('ready');
    setSnake(initialSnake);
    setDirection({ x: 0, y: 0 }); // Direction neutre pour l'état ready
    setScore(0);
    setGameSpeed(150);
    setFood(generateFood(initialSnake));
    setGameStartTime(null);
    setGameDuration(0);
  };

  // Tester la connexion au modèle
  const testConnection = async () => {
    try {
      const response = await api.get('/easter-egg-scores/test');
      console.log('Test de connexion réussi:', response.data);
      alert('Connexion au modèle OK !');
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      if (error.response) {
        console.error('Détails de l\'erreur:', error.response.data);
        alert(`Erreur de connexion: ${error.response.data.message}`);
      }
    }
  };

  // Enregistrer le score
  const saveScore = async () => {
    try {
      // Calculer la durée si elle n'est pas définie
      const finalDuration = gameDuration || (gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0);
      
      const scoreData = {
        easterEggType: 'snake-game',
        score: Math.max(0, score),
        level: Math.max(1, Math.floor(score / 10) + 1),
        duration: Math.max(0, finalDuration),
        snakeLength: Math.max(1, snake.length),
        gameData: {
          finalSpeed: gameSpeed,
          foodEaten: Math.floor(score / 10)
        }
      };

      console.log('Envoi des données de score:', scoreData);

      const response = await api.post('/easter-egg-scores', scoreData);
      console.log('Score enregistré avec succès:', response.data);
      
      // Afficher un message de succès (optionnel)
      alert(`Score de ${score} points enregistré avec succès !`);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du score:', error);
      if (error.response) {
        console.error('Détails de l\'erreur:', error.response.data);
        alert(`Erreur: ${error.response.data.message}`);
      }
    }
  };

  // Rendu du serpent
  const renderSnake = () => {
    return snake.map((segment, index) => (
      <SnakeSegment
        key={index}
        sx={{
          left: segment.x,
          top: segment.y,
          backgroundColor: index === 0 ? '#00ff00' : '#00cc00',
        }}
      />
    ));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#000',
          color: '#00ff00',
          border: '2px solid #00ff00',
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        fontFamily: '"Courier New", monospace',
        color: '#00ff00',
        borderBottom: '1px solid #00ff00'
      }}>
        🐍 SNAKE RÉTRO 🐍
      </DialogTitle>
      
      <DialogContent>
        <GameContainer>
          <ScoreDisplay>
            Score: {score} | Vitesse: {Math.round((200 - gameSpeed) / 2)}%
          </ScoreDisplay>
          
          <GameBoard>
            {renderSnake()}
            <Food sx={{ left: food.x, top: food.y }} />
            
            {gameState === 'ready' && (
              <GameOverDisplay>
                <Typography variant="h5" sx={{ color: '#00ff00', mb: 2 }}>
                  Prêt à jouer ?
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00', mb: 2 }}>
                  Utilisez les flèches pour diriger le serpent
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00' }}>
                  Espace pour pause/reprendre
                </Typography>
              </GameOverDisplay>
            )}
            
            {gameState === 'paused' && (
              <GameOverDisplay>
                <Typography variant="h5" sx={{ color: '#ffff00' }}>
                  PAUSE
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffff00' }}>
                  Appuyez sur Espace pour reprendre
                </Typography>
              </GameOverDisplay>
            )}
            
            {gameState === 'gameOver' && (
              <GameOverDisplay>
                <Typography variant="h4" sx={{ color: '#ff0000', mb: 2 }}>
                  GAME OVER
                </Typography>
                <Typography variant="h6" sx={{ color: '#00ff00', mb: 1 }}>
                  Score final: {score}
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00', mb: 1 }}>
                  Durée: {gameDuration}s
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00', mb: 2 }}>
                  Longueur du serpent: {snake.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00' }}>
                  Appuyez sur "Nouvelle Partie" pour rejouer
                </Typography>
              </GameOverDisplay>
            )}
          </GameBoard>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            {gameState === 'ready' && (
              <Button 
                variant="contained" 
                onClick={startGame}
                sx={{ 
                  backgroundColor: '#00ff00', 
                  color: '#000',
                  fontFamily: '"Courier New", monospace',
                  '&:hover': { backgroundColor: '#00cc00' }
                }}
              >
                COMMENCER
              </Button>
            )}
            
            {gameState === 'gameOver' && (
              <>
                <Button 
                  variant="contained" 
                  onClick={restartGame}
                  sx={{ 
                    backgroundColor: '#00ff00', 
                    color: '#000',
                    fontFamily: '"Courier New", monospace',
                    '&:hover': { backgroundColor: '#00cc00' }
                  }}
                >
                  NOUVELLE PARTIE
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={testConnection}
                  sx={{ 
                    borderColor: '#ffff00', 
                    color: '#ffff00',
                    fontFamily: '"Courier New", monospace',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 0, 0.1)',
                      borderColor: '#cccc00'
                    }
                  }}
                >
                  TEST CONNEXION
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={saveScore}
                  sx={{ 
                    borderColor: '#00ff00', 
                    color: '#00ff00',
                    fontFamily: '"Courier New", monospace',
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 255, 0, 0.1)',
                      borderColor: '#00cc00'
                    }
                  }}
                >
                  SAUVEGARDER SCORE
                </Button>
              </>
            )}
          </Box>
          
          <Typography variant="body2" sx={{ color: '#00ff00', mt: 2, textAlign: 'center' }}>
            Contrôles: ↑ ↓ ← → | Espace: Commencer/Pause/Reprendre
          </Typography>
        </GameContainer>
      </DialogContent>
      
      <DialogActions sx={{ borderTop: '1px solid #00ff00' }}>
        <Button 
          onClick={onClose} 
          sx={{ 
            color: '#00ff00',
            fontFamily: '"Courier New", monospace'
          }}
        >
          FERMER
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SnakeGame;
