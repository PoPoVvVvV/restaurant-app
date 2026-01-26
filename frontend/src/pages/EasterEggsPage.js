import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoIcon from '@mui/icons-material/Info';
import { useEasterEgg } from '../context/EasterEggContext';
import SnakeGame from '../components/SnakeGame';
import FlappyBird from '../components/FlappyBird';
import TetrisGame from '../components/TetrisGame';
import Leaderboard from '../components/Leaderboard';

// Style rétro pour les cartes d'easter-egg
const EasterEggCard = styled(Card)(({ theme, unlocked }) => ({
  background: unlocked 
    ? 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)'
    : 'linear-gradient(135deg, #333 0%, #555 100%)',
  color: unlocked ? '#000' : '#666',
  border: unlocked ? '2px solid #00ff00' : '2px solid #444',
  borderRadius: '12px',
  boxShadow: unlocked 
    ? '0 0 20px rgba(0, 255, 0, 0.3)'
    : '0 4px 8px rgba(0, 0, 0, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: unlocked ? 'translateY(-5px)' : 'none',
    boxShadow: unlocked 
      ? '0 0 30px rgba(0, 255, 0, 0.5)'
      : '0 4px 8px rgba(0, 0, 0, 0.3)',
  }
}));

const EasterEggIcon = styled(Box)(({ theme }) => ({
  fontSize: '3rem',
  textAlign: 'center',
  marginBottom: '1rem',
  filter: 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3))'
}));

const EasterEggsPage = () => {
  const { 
    isEasterEggUnlocked, 
    openSnakeGame, 
    showSnakeGame, 
    closeSnakeGame,
    isFlappyBirdUnlocked,
    openFlappyBird,
    showFlappyBird,
    closeFlappyBird,
    checkFlappyBirdUnlock,
    isTetrisUnlocked,
    showTetrisGame,
    openTetrisGame,
    closeTetrisGame,
    unlockTetris
  } = useEasterEgg();
  const [selectedEasterEgg, setSelectedEasterEgg] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showTetrisQuiz, setShowTetrisQuiz] = useState(false);
  const [tetrisAnswers, setTetrisAnswers] = useState({ q1: '', q2: '', q3: '' });
  const [tetrisError, setTetrisError] = useState('');

  // Liste des easter-eggs
  const easterEggs = [
    {
      id: 'snake-game',
      name: 'Snake Rétro',
      description: 'Un Snake classique avec un style rétro',
      icon: '🐍',
      unlocked: isEasterEggUnlocked,
      category: 'Jeux',
      difficulty: 'Moyen',
      hint: 'Trouvez la séquence secrète dans la navigation...',
      instructions: 'Utilisez les flèches directionnelles pour diriger le serpent. Mangez la nourriture rouge pour grandir et gagner des points. Évitez les murs et votre propre corps !'
    },
    {
      id: 'flappy-bird',
      name: 'Flappy Bird',
      description: 'Un Flappy Bird addictif avec système de classement',
      icon: '🐦',
      unlocked: isFlappyBirdUnlocked,
      category: 'Jeux',
      difficulty: 'Difficile',
      hint: 'Dépassez 20 000$ de CA total pour débloquer ce jeu !',
      instructions: 'Appuyez sur ESPACE ou cliquez pour faire voler l\'oiseau. Évitez les tuyaux verts et collectez des points !'
    }
    ,
    {
      id: 'tetris',
      name: 'Tetris Mystère',
      description: 'Débloquez Tetris en répondant correctement à 3 énigmes',
      icon: '🧩',
      unlocked: isTetrisUnlocked,
      category: 'Jeux',
      difficulty: 'Moyen',
      hint: 'Répondez aux 3 énigmes pour le révéler',
      instructions: 'Déplacez, faites pivoter et empilez les tetrominos pour compléter des lignes.'
    }
  ];

  const handlePlayEasterEgg = (easterEgg) => {
    if (easterEgg.unlocked) {
      if (easterEgg.id === 'snake-game') {
        openSnakeGame();
      } else if (easterEgg.id === 'flappy-bird') {
        openFlappyBird();
      } else if (easterEgg.id === 'tetris') {
        openTetrisGame();
      }
    } else {
      if (easterEgg.id === 'tetris') {
        setShowTetrisQuiz(true);
      }
    }
  };

  const handleShowInfo = (easterEgg) => {
    setSelectedEasterEgg(easterEgg);
    setShowInfo(true);
  };

  const handleCloseInfo = () => {
    setShowInfo(false);
    setSelectedEasterEgg(null);
  };

  const validateTetrisQuiz = () => {
    // Normaliser les réponses (accents/casse/espaces)
    const normalize = (s) => s.toString().trim().toLowerCase()
      .replaceAll("'", '')
      .replaceAll('’', '')
      .replaceAll('é', 'e')
      .replaceAll('è', 'e')
      .replaceAll('ê', 'e')
      .replaceAll('à', 'a')
      .replaceAll('â', 'a')
      .replaceAll('î', 'i')
      .replaceAll('ï', 'i')
      .replaceAll('ô', 'o')
      .replaceAll('ù', 'u');

    const a1 = normalize(tetrisAnswers.q1);
    const a2 = normalize(tetrisAnswers.q2);
    const a3 = normalize(tetrisAnswers.q3);

    const ok1 = a1 === 'rien' || a1 === 'nothing';
    const ok2 = a2.includes('ombre');
    const ok3 = a3.includes('cercueil') || a3.includes('coffre funeraire');

    if (ok1 && ok2 && ok3) {
      unlockTetris();
      setShowTetrisQuiz(false);
      setTetrisError('');
      setTetrisAnswers({ q1: '', q2: '', q3: '' });
      openTetrisGame();
    } else {
      setTetrisError('Une ou plusieurs réponses sont incorrectes.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontFamily: '"Courier New", monospace',
            background: 'linear-gradient(45deg, #00ff00, #ffff00, #ff00ff)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          🎮 Easter-Eggs 🎮
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontFamily: '"Courier New", monospace', mb: 2 }}>
          Découvrez les secrets cachés de l'application
        </Typography>
        <Button
          variant="outlined"
          onClick={checkFlappyBirdUnlock}
          sx={{ 
            fontFamily: '"Courier New", monospace',
            borderColor: '#00ff00',
            color: '#00ff00',
            '&:hover': {
              borderColor: '#ffff00',
              color: '#ffff00',
              backgroundColor: 'rgba(0, 255, 0, 0.1)'
            }
          }}
        >
          🔄 Vérifier le déblocage Flappy Bird
        </Button>
      </Box>

      <Grid container spacing={3}>
        {easterEggs.map((easterEgg) => (
          <Grid item xs={12} sm={6} md={4} key={easterEgg.id}>
            <EasterEggCard unlocked={easterEgg.unlocked}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <EasterEggIcon>
                  {easterEgg.icon}
                </EasterEggIcon>
                
                <Typography 
                  variant="h5" 
                  component="h2" 
                  gutterBottom
                  sx={{ 
                    fontFamily: '"Courier New", monospace',
                    fontWeight: 'bold'
                  }}
                >
                  {easterEgg.name}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 2,
                    fontFamily: '"Courier New", monospace',
                    opacity: easterEgg.unlocked ? 1 : 0.7
                  }}
                >
                  {easterEgg.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    label={easterEgg.category} 
                    size="small" 
                    sx={{ 
                      backgroundColor: easterEgg.unlocked ? '#000' : '#444',
                      color: easterEgg.unlocked ? '#00ff00' : '#666',
                      fontFamily: '"Courier New", monospace'
                    }}
                  />
                  <Chip 
                    label={easterEgg.difficulty} 
                    size="small" 
                    sx={{ 
                      backgroundColor: easterEgg.unlocked ? '#000' : '#444',
                      color: easterEgg.unlocked ? '#00ff00' : '#666',
                      fontFamily: '"Courier New", monospace'
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                  {easterEgg.unlocked ? (
                    <LockOpenIcon sx={{ color: '#00ff00', mr: 1 }} />
                  ) : (
                    <LockIcon sx={{ color: '#666', mr: 1 }} />
                  )}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: '"Courier New", monospace',
                      color: easterEgg.unlocked ? '#00ff00' : '#666'
                    }}
                  >
                    {easterEgg.unlocked ? 'Débloqué' : 'Verrouillé'}
                  </Typography>
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={easterEgg.unlocked ? <PlayArrowIcon /> : <LockIcon />}
                  onClick={() => handlePlayEasterEgg(easterEgg)}
                  disabled={!easterEgg.unlocked && easterEgg.id !== 'tetris'}
                  sx={{
                    backgroundColor: easterEgg.unlocked ? '#000' : '#444',
                    color: easterEgg.unlocked ? '#00ff00' : '#666',
                    fontFamily: '"Courier New", monospace',
                    '&:hover': {
                      backgroundColor: easterEgg.unlocked ? '#333' : '#444',
                    },
                    '&:disabled': {
                      backgroundColor: '#444',
                      color: '#666'
                    }
                  }}
                >
                  {easterEgg.id === 'tetris' ? (easterEgg.unlocked ? 'Jouer' : 'Débloquer') : (easterEgg.unlocked ? 'Jouer' : 'Verrouillé')}
                </Button>
                
                <Tooltip title="Plus d'informations">
                  <IconButton 
                    onClick={() => handleShowInfo(easterEgg)}
                    sx={{ 
                      color: easterEgg.unlocked ? '#00ff00' : '#666',
                      '&:hover': {
                        backgroundColor: easterEgg.unlocked ? 'rgba(0, 255, 0, 0.1)' : 'rgba(102, 102, 102, 0.1)'
                      }
                    }}
                  >
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </EasterEggCard>
          </Grid>
        ))}
      </Grid>

      {/* Dialog d'information */}
      <Dialog open={showInfo} onClose={handleCloseInfo} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Courier New", monospace' }}>
          {selectedEasterEgg?.name} - Informations
        </DialogTitle>
        <DialogContent>
          {selectedEasterEgg && (
            <Box>
              <Typography variant="body1" paragraph sx={{ fontFamily: '"Courier New", monospace' }}>
                <strong>Description :</strong> {selectedEasterEgg.description}
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ fontFamily: '"Courier New", monospace' }}>
                <strong>Catégorie :</strong> {selectedEasterEgg.category}
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ fontFamily: '"Courier New", monospace' }}>
                <strong>Difficulté :</strong> {selectedEasterEgg.difficulty}
              </Typography>
              
              {selectedEasterEgg.unlocked ? (
                <Typography variant="body1" paragraph sx={{ fontFamily: '"Courier New", monospace' }}>
                  <strong>Instructions :</strong> {selectedEasterEgg.instructions}
                </Typography>
              ) : (
                <Typography variant="body1" paragraph sx={{ fontFamily: '"Courier New", monospace', color: '#666' }}>
                  <strong>Indice :</strong> {selectedEasterEgg.hint}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseInfo}
            sx={{ fontFamily: '"Courier New", monospace' }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sections Classement */}
      <Box sx={{ mt: 4 }}>
        <Leaderboard easterEggType="snake-game" />
      </Box>
      <Box sx={{ mt: 4 }}>
        <Leaderboard easterEggType="tetris" />
      </Box>

      {/* Composants de jeux */}
      <SnakeGame open={showSnakeGame} onClose={closeSnakeGame} />
      <FlappyBird open={showFlappyBird} onClose={closeFlappyBird} />
      <TetrisGame open={showTetrisGame} onClose={closeTetrisGame} />

      {/* Quiz Tetris */}
      <Dialog open={showTetrisQuiz} onClose={() => setShowTetrisQuiz(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Courier New", monospace' }}>
          🔓 Débloquer Tetris - Répondez aux 3 énigmes
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: '"Courier New", monospace' }}>
              1) Plus puissant que Dieu, plus mauvais que le Diable, les pauvres en ont, les riches en ont besoin. Qu'est-ce ?
            </Typography>
            <input value={tetrisAnswers.q1} onChange={(e) => setTetrisAnswers(prev => ({ ...prev, q1: e.target.value }))} style={{ padding: 8 }} />
            <Typography variant="body2" sx={{ fontFamily: '"Courier New", monospace' }}>
              2) Qu'est ce qui est plus grand que la Tour Eiffel, mais infiniment moins lourd ?
            </Typography>
            <input value={tetrisAnswers.q2} onChange={(e) => setTetrisAnswers(prev => ({ ...prev, q2: e.target.value }))} style={{ padding: 8 }} />
            <Typography variant="body2" sx={{ fontFamily: '"Courier New", monospace' }}>
              3) Le fabricant n'en veut pas, l'acheteur ne s'en sert pas et l'utilisateur ne le voit pas. Quel est cet objet ?
            </Typography>
            <input value={tetrisAnswers.q3} onChange={(e) => setTetrisAnswers(prev => ({ ...prev, q3: e.target.value }))} style={{ padding: 8 }} />
            {tetrisError && (
              <Typography variant="caption" color="error" sx={{ fontFamily: '"Courier New", monospace' }}>
                {tetrisError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTetrisQuiz(false)} sx={{ fontFamily: '"Courier New", monospace' }}>
            Annuler
          </Button>
          <Button onClick={validateTetrisQuiz} sx={{ fontFamily: '"Courier New", monospace' }}>
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EasterEggsPage;
