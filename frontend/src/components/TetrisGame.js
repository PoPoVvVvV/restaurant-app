import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip } from '@mui/material';
import api from '../services/api';

const COLS = 10;
const ROWS = 20;
const BLOCK = 24;
const TARGET_FPS = 30;

const SHAPES = {
  I: [[1,1,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0]],
  T: [[0,1,0],[1,1,1]],
  Z: [[1,1,0],[0,1,1]],
};
const COLORS = {
  I: '#00ffff', J: '#0000ff', L: '#ffa500', O: '#ffff00', S: '#00ff00', T: '#800080', Z: '#ff0000'
};
const SHAPE_KEYS = Object.keys(SHAPES);

const randomPiece = () => {
  const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  return { key, shape: SHAPES[key].map(r => [...r]), x: 3, y: 0 };
};

const rotate = (matrix) => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      rotated[x][rows - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
};

const TetrisGame = ({ open, onClose }) => {
  const canvasRef = useRef(null);
  const boardRef = useRef(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const pieceRef = useRef(randomPiece());
  const dropIntervalRef = useRef(null);
  const speedMsRef = useRef(600);
  const lastDropRef = useRef(0);
  const scoreRef = useRef(0);
  const startedAtRef = useRef(0);
  const isSavingRef = useRef(false);
  const isGameOverRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const resetGame = useCallback(() => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    pieceRef.current = randomPiece();
    speedMsRef.current = 600;
    lastDropRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setLines(0);
    setGameOver(false);
    isGameOverRef.current = false;
    isSavingRef.current = false;
    startedAtRef.current = Date.now();
  }, []);

  const collides = (piece, dx = 0, dy = 0, shape = piece.shape) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[0].length; x++) {
        if (!shape[y][x]) continue;
        const nx = piece.x + x + dx;
        const ny = piece.y + y + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && boardRef.current[ny][nx]) return true;
      }
    }
    return false;
  };

  const mergePiece = (piece) => {
    const color = COLORS[piece.key];
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[0].length; x++) {
        if (piece.shape[y][x]) {
          const by = piece.y + y;
          const bx = piece.x + x;
          if (by >= 0) boardRef.current[by][bx] = color;
        }
      }
    }
  };

  const clearLines = () => {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (boardRef.current[y].every(cell => cell)) {
        boardRef.current.splice(y, 1);
        boardRef.current.unshift(Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    if (cleared > 0) {
      const add = [0, 100, 300, 500, 800][cleared] || 0;
      scoreRef.current += add;
      setScore(scoreRef.current);
      setLines(prev => prev + cleared);
      speedMsRef.current = Math.max(120, speedMsRef.current - cleared * 20);
    }
  };

  const spawnPiece = () => {
    pieceRef.current = randomPiece();
    if (collides(pieceRef.current, 0, 0)) {
      handleGameOver();
    }
  };

  const hardDrop = () => {
    while (!collides(pieceRef.current, 0, 1)) {
      pieceRef.current.y += 1;
    }
    tickDown(true);
  };

  const tickDown = (forceMerge = false) => {
    if (!collides(pieceRef.current, 0, 1)) {
      pieceRef.current.y += 1;
    } else if (forceMerge || collides(pieceRef.current, 0, 1)) {
      mergePiece(pieceRef.current);
      clearLines();
      spawnPiece();
    }
  };

  const move = (dx) => {
    if (!collides(pieceRef.current, dx, 0)) {
      pieceRef.current.x += dx;
    }
  };

  const rotatePiece = () => {
    const rotated = rotate(pieceRef.current.shape);
    if (!collides(pieceRef.current, 0, 0, rotated)) {
      pieceRef.current.shape = rotated;
    } else {
      // petit wall-kick simple
      if (!collides(pieceRef.current, -1, 0, rotated)) {
        pieceRef.current.x -= 1; pieceRef.current.shape = rotated;
      } else if (!collides(pieceRef.current, 1, 0, rotated)) {
        pieceRef.current.x += 1; pieceRef.current.shape = rotated;
      }
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);

    // Draw board
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = boardRef.current[y][x];
        if (cell) {
          ctx.fillStyle = cell;
          ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1);
        }
      }
    }

    // Draw piece
    const p = pieceRef.current;
    const color = COLORS[p.key];
    ctx.fillStyle = color;
    for (let y = 0; y < p.shape.length; y++) {
      for (let x = 0; x < p.shape[0].length; x++) {
        if (!p.shape[y][x]) continue;
        const px = (p.x + x) * BLOCK;
        const py = (p.y + y) * BLOCK;
        if (py >= 0) ctx.fillRect(px, py, BLOCK - 1, BLOCK - 1);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    resetGame();

    const handleKey = (e) => {
      if (!open) return;
      if (e.code === 'ArrowLeft') move(-1);
      else if (e.code === 'ArrowRight') move(1);
      else if (e.code === 'ArrowUp') rotatePiece();
      else if (e.code === 'ArrowDown') tickDown();
      else if (e.code === 'Space') hardDrop();
      draw();
    };

    window.addEventListener('keydown', handleKey);

    let last = 0;
    const step = 1000 / TARGET_FPS;
    const loop = (t) => {
      if (!open) return;
      if (t - last >= step) {
        last = t;
        draw();
        if (!lastDropRef.current) lastDropRef.current = t;
        if (t - lastDropRef.current >= speedMsRef.current) {
          lastDropRef.current = t;
          tickDown();
        }
      }
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKey);
      cancelAnimationFrame(id);
    };
  }, [open, resetGame, draw]);

  const handleGameOver = useCallback(async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setGameOver(true);
    // Sauvegarde automatique du score
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      const duration = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      const payload = {
        easterEggType: 'tetris',
        score: Math.max(0, scoreRef.current),
        level: Math.max(1, Math.floor(lines / 10) + 1),
        duration,
        snakeLength: 0,
        gameData: {
          linesCleared: lines,
          finalSpeedMs: speedMsRef.current,
        }
      };
      await api.post('/easter-egg-scores', payload);
    } catch (e) {
      // silencieux: on ne bloque pas l'UX
      // console.error('Erreur sauvegarde Tetris', e);
    } finally {
      isSavingRef.current = false;
    }
  }, [lines]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Courier New", monospace' }}>
        🧩 TETRIS
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <canvas ref={canvasRef} width={COLS * BLOCK} height={ROWS * BLOCK} style={{ border: '2px solid #00ff00', background: '#111' }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Score: ${score}`} sx={{ backgroundColor: '#00ff00', color: '#000', fontFamily: '"Courier New", monospace' }} />
            <Chip label={`Lignes: ${lines}`} sx={{ backgroundColor: '#000', color: '#00ff00', fontFamily: '"Courier New", monospace', border: '1px solid #00ff00' }} />
          </Box>
          <Typography variant="body2" sx={{ fontFamily: '"Courier New", monospace', color: '#666' }}>
            Contrôles: ← → déplacer | ↑ pivoter | ↓ descendre | Espace chute
          </Typography>
          {gameOver && (
            <Typography variant="body2" sx={{ fontFamily: '"Courier New", monospace', color: '#ff4444' }}>
              Game Over - Score sauvegardé
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetGame} sx={{ fontFamily: '"Courier New", monospace' }}>Nouvelle partie</Button>
        <Button onClick={onClose} sx={{ fontFamily: '"Courier New", monospace' }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TetrisGame;
