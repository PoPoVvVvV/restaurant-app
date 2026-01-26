import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Avatar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../services/api';

const LeaderboardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#000',
  color: '#00ff00',
  borderRadius: '12px',
  border: '2px solid #00ff00',
  padding: '20px',
  fontFamily: '"Courier New", monospace',
}));

const RankCell = styled(TableCell)(({ rank }) => ({
  color: rank === 1 ? '#ffff00' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#00ff00',
  fontWeight: 'bold',
  fontFamily: '"Courier New", monospace',
}));

const ScoreCell = styled(TableCell)({
  color: '#00ff00',
  fontFamily: '"Courier New", monospace',
  fontWeight: 'bold',
});

const Leaderboard = ({ easterEggType = 'snake-game' }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [myBestScore, setMyBestScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaderboardRes, statsRes, myBestRes] = await Promise.all([
        api.get(`/easter-egg-scores/leaderboard/${easterEggType}?limit=20`),
        api.get(`/easter-egg-scores/stats/${easterEggType}`),
        api.get(`/easter-egg-scores/my-best/${easterEggType}`)
      ]);

      setLeaderboard(leaderboardRes.data.leaderboard);
      setStats(statsRes.data?.stats || statsRes.data);
      setMyBestScore(myBestRes.data.bestScore);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  }, [easterEggType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <LeaderboardContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: '#00ff00' }} />
        </Box>
      </LeaderboardContainer>
    );
  }

  return (
    <LeaderboardContainer>
      <Typography variant="h4" sx={{ textAlign: 'center', mb: 3, fontFamily: '"Courier New", monospace' }}>
        🏆 CLASSEMENT SNAKE 🏆
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{
          borderBottom: '1px solid #00ff00',
          mb: 3,
          '& .MuiTab-root': {
            color: '#00ff00',
            fontFamily: '"Courier New", monospace',
            '&.Mui-selected': {
              color: '#ffff00',
            }
          }
        }}
      >
        <Tab label="Classement" />
        <Tab label="Statistiques" />
        <Tab label="Mon Meilleur Score" />
      </Tabs>

      {activeTab === 0 && (
        <TableContainer component={Paper} sx={{ backgroundColor: '#000', border: '1px solid #00ff00' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontWeight: 'bold' }}>
                  Rang
                </TableCell>
                <TableCell sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontWeight: 'bold' }}>
                  Joueur
                </TableCell>
                <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontWeight: 'bold' }}>
                  Score
                </TableCell>
                <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontWeight: 'bold' }}>
                  Niveau
                </TableCell>
                <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontWeight: 'bold' }}>
                  Durée
                </TableCell>
                <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontWeight: 'bold' }}>
                  Longueur
                </TableCell>
                <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontWeight: 'bold' }}>
                  Date
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((entry, index) => (
                <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'rgba(0, 255, 0, 0.1)' } }}>
                  <RankCell rank={index + 1}>
                    {getRankIcon(index + 1)}
                  </RankCell>
                  <TableCell sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: '#00ff00', color: '#000', fontSize: '0.8rem' }}>
                        {entry.username.charAt(0).toUpperCase()}
                      </Avatar>
                      {entry.username}
                    </Box>
                  </TableCell>
                  <ScoreCell align="right">
                    {entry.score.toLocaleString()}
                  </ScoreCell>
                  <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                    {entry.level}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                    {formatDuration(entry.duration)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                    {entry.snakeLength}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', fontSize: '0.8rem' }}>
                    {formatDate(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#111', border: '1px solid #00ff00' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                  {stats.totalGames}
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                  Parties Jouées
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#111', border: '1px solid #00ff00' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                  {stats.totalPlayers}
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                  Joueurs Uniques
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#111', border: '1px solid #00ff00' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#ffff00', fontFamily: '"Courier New", monospace' }}>
                  {stats.maxScore}
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                  Meilleur Score
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#111', border: '1px solid #00ff00' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                  {stats.averageScore}
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace' }}>
                  Score Moyen
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Box sx={{ textAlign: 'center' }}>
          {myBestScore ? (
            <Card sx={{ backgroundColor: '#111', border: '2px solid #00ff00', maxWidth: 400, mx: 'auto' }}>
              <CardContent>
                <Typography variant="h5" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', mb: 2 }}>
                  🏆 Votre Meilleur Score
                </Typography>
                <Typography variant="h3" sx={{ color: '#ffff00', fontFamily: '"Courier New", monospace', mb: 1 }}>
                  {myBestScore.score.toLocaleString()}
                </Typography>
                <Typography variant="body1" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', mb: 1 }}>
                  Niveau: {myBestScore.level}
                </Typography>
                <Typography variant="body1" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', mb: 1 }}>
                  Durée: {formatDuration(myBestScore.duration)}
                </Typography>
                <Typography variant="body1" sx={{ color: '#00ff00', fontFamily: '"Courier New", monospace', mb: 1 }}>
                  Longueur: {myBestScore.snakeLength}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', fontFamily: '"Courier New", monospace' }}>
                  {formatDate(myBestScore.createdAt)}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Typography variant="h6" sx={{ color: '#666', fontFamily: '"Courier New", monospace' }}>
              Aucun score enregistré
            </Typography>
          )}
        </Box>
      )}
    </LeaderboardContainer>
  );
};

export default Leaderboard;
