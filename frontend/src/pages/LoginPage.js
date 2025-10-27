import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import { Container, Box, Paper, Typography, TextField, Button, Link, CircularProgress, Grid, IconButton, Slider } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const audioRef = useRef(null);
  const [audioError, setAudioError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      const v = localStorage.getItem('halloween-volume');
      return v !== null ? Number(v) : 25; // default 25%
    } catch (e) {
      return 25;
    }
  });

  // Charger la préférence muted si présente
  useEffect(() => {
    try {
      const m = localStorage.getItem('halloween-muted');
      if (m !== null) {
        setMuted(JSON.parse(m));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const onChange = (e) => {
    const value = e.target.value;
    // Préserver les espaces dans le nom d'utilisateur
    setFormData({ ...formData, [e.target.name]: value });
  };

  useEffect(() => {
    // Create audio instance once
    if (!audioRef.current) {
      const audio = new Audio('/halloween-loop.mp3');
      audio.loop = true;
      audio.preload = 'auto';
      audio.autoplay = true;
      audio.playsInline = true;
      try { audio.crossOrigin = 'anonymous'; } catch (e) {}
      audio.volume = Math.max(0, Math.min(1, volume / 100));
      audio.muted = !!muted;
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    // If user is not authenticated, try to play the audio.
    // Many browsers block autoplay with sound; as a fallback we try muted autoplay
    // (allowed by most browsers) so the music starts automatically but silently,
    // then the user can unmute with the control.
    if (!isAuthenticated) {
      const tryPlay = async () => {
        try {
          // Try audible play first
          audio.muted = !!muted ? true : false;
          audio.volume = Math.max(0, Math.min(1, volume / 100));
          await audio.play();
          setIsPlaying(true);
          setAudioError(false);
        } catch (err) {
          // Autoplay with sound blocked, try muted autoplay
          try {
            audio.muted = true;
            await audio.play();
            setIsPlaying(true);
            // don't overwrite user's preference here
            setAudioError(false);
          } catch (err2) {
            // All autoplay attempts failed. Try Web Audio API as a last resort —
            // some browsers may allow playback when decoding via AudioContext,
            // but many still require a user gesture. This is best-effort.
            try {
              const resp = await fetch('/halloween-loop.mp3');
              const arrayBuffer = await resp.arrayBuffer();
              const AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (AudioCtx) {
                const ctx = new AudioCtx();
                // Try resume in case context is suspended due to autoplay policies
                try { await ctx.resume(); } catch (e) {}
                const decoded = await ctx.decodeAudioData(arrayBuffer);
                const src = ctx.createBufferSource();
                src.buffer = decoded;
                const gain = ctx.createGain();
                gain.gain.value = Math.max(0, Math.min(1, volume / 100));
                src.loop = true;
                src.connect(gain).connect(ctx.destination);
                src.start(0);
                // store context and source so we can stop later
                audioRef.current._webaudio = { ctx, src, gain };
                setIsPlaying(true);
                setAudioError(false);
              } else {
                setAudioError(true);
                setIsPlaying(false);
              }
            } catch (err3) {
              setAudioError(true);
              setIsPlaying(false);
            }
          }
        }
      };
      tryPlay();
    } else {
      // Pause and reset when authenticated
      // Stop normal audio
      try { audio.pause(); } catch (e) {}
      try { audio.currentTime = 0; } catch (e) {}
      // Stop WebAudio if running
      if (audio._webaudio) {
        try { audio._webaudio.src.stop(); } catch (e) {}
        try { audio._webaudio.ctx.close(); } catch (e) {}
        delete audio._webaudio;
      }
      setIsPlaying(false);
    }

    return () => {
      // Pause when component unmounts / navigation
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch (e) {}
        try { audioRef.current.currentTime = 0; } catch (e) {}
        if (audioRef.current._webaudio) {
          try { audioRef.current._webaudio.src.stop(); } catch (e) {}
          try { audioRef.current._webaudio.ctx.close(); } catch (e) {}
          delete audioRef.current._webaudio;
        }
      }
      setIsPlaying(false);
    };
  }, [isAuthenticated, volume, muted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
        setAudioError(false);
      } catch (err) {
        setAudioError(true);
      }
    }
  };

  const handleToggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const newMuted = !muted;
    audio.muted = newMuted;
    setMuted(newMuted);
    try { localStorage.setItem('halloween-muted', JSON.stringify(newMuted)); } catch (e) {}
  };

  const handleVolumeChange = (e, value) => {
    const audio = audioRef.current;
    const v = Number(value);
    setVolume(v);
    try { localStorage.setItem('halloween-volume', String(v)); } catch (e) {}
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, v / 100));
      if (v === 0) {
        audio.muted = true;
        setMuted(true);
      } else {
        // If previously muted but user moves slider, unmute
        audio.muted = false;
        setMuted(false);
      }
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', formData);
      login(response.data.token);
      navigate('/ventes');
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
        setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const username = prompt("Veuillez entrer votre nom d'utilisateur pour demander une réinitialisation :");
    if (username) {
        try {
            const res = await api.post('/auth/forgot-password', { username });
            showNotification(res.data, 'info');
        } catch (err) {
            showNotification(err.response?.data || 'Erreur', 'error');
        }
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Connexion
        </Typography>
        <Box component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal" required fullWidth id="username" label="Nom d'utilisateur"
            name="username" autoComplete="username" autoFocus value={formData.username} onChange={onChange}
            inputProps={{ 
              style: { textTransform: 'none' },
              onKeyDown: (e) => {
                // Permettre tous les caractères y compris les espaces
                if (e.key === ' ') {
                  e.stopPropagation();
                }
              },
              onInput: (e) => {
                // S'assurer que les espaces sont préservés
                const value = e.target.value;
                if (value !== formData.username) {
                  setFormData({ ...formData, username: value });
                }
              }
            }}
          />
          <TextField
            margin="normal" required fullWidth name="password" label="Mot de passe"
            type="password" id="password" autoComplete="current-password" value={formData.password} onChange={onChange}
          />
          {error && <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>{error}</Typography>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Se connecter'}
          </Button>
          <Grid container sx={{ textAlign: 'center' }}>
            <Grid item xs={12}>
              <Link component="button" type="button" variant="body2" onClick={handleForgotPassword}>
                Mot de passe oublié ?
              </Link>
            </Grid>
            <Grid item xs={12}>
              <Link component={RouterLink} to="/register" variant="body2">
                {"Pas encore de compte ? S'inscrire"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      {/* Panneau de contrôle audio Halloween (fixé) */}
      <Box
        sx={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          bgcolor: 'rgba(20,20,20,0.88)',
          border: '1px solid rgba(151,71,255,0.08)',
          p: 1,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          boxShadow: '0 6px 20px rgba(0,0,0,0.6), 0 0 12px rgba(255,133,51,0.06)',
          zIndex: 1400,
        }}
      >
        <IconButton onClick={togglePlay} size="small" sx={{ color: 'orange', bgcolor: 'transparent' }} aria-label="play-pause">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        <IconButton onClick={handleToggleMute} size="small" sx={{ color: muted ? 'gray' : 'orange' }} aria-label="mute-unmute">
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>

        <Box sx={{ width: 140, px: 1 }}>
          <Slider value={volume} onChange={handleVolumeChange} aria-label="volume" size="small" />
        </Box>

        {/* Indicateur discret quand la musique joue */}
        <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: isPlaying && !muted ? 'orange' : 'rgba(255,133,51,0.18)',
              boxShadow: isPlaying && !muted ? '0 0 8px rgba(255,133,51,0.9)' : 'none',
              transition: 'all 250ms ease',
              animation: isPlaying && !muted ? 'pulse 1.6s infinite' : 'none',
            }}
            aria-hidden
          />
        </Box>
      </Box>
    </Container>
  );
}

export default LoginPage;