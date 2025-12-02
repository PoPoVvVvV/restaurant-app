import React from 'react';
import { keyframes, styled } from '@mui/material/styles';

// Animations
const float = keyframes`
  0% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(5deg); }
  100% { transform: translateY(0) rotate(0deg); }
`;

const twinkle = keyframes`
  0% { opacity: 0.7; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.3); }
  100% { opacity: 0.7; filter: brightness(1); }
`;

// Styles de base
const DecorationBase = styled('div')({
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 2,
  animation: `${float} 6s ease-in-out infinite`,
  willChange: 'transform, opacity',
});

// Sapin de Noël stylisé
const ChristmasTree = styled(({ className, size = 80, style }) => (
  <div className={className} style={style}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path 
        d="M50 10 L30 50 L40 50 L25 80 L40 80 L20 100 L80 100 L60 80 L75 80 L60 50 L70 50 Z" 
        fill="#2e7d32"
        stroke="#1b5e20"
        strokeWidth="2"
      />
      <circle cx="50" cy="30" r="3" fill="#ffd700" />
      <circle cx="35" cy="50" r="3" fill="#ff4081" />
      <circle cx="65" cy="50" r="3" fill="#2196f3" />
      <circle cx="50" cy="70" r="3" fill="#ff9800" />
      <rect x="45" y="90" width="10" height="10" fill="#8d6e63" />
    </svg>
  </div>
))({
  '& svg': {
    filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.3))',
  },
  'circle, rect': {
    animation: `${twinkle} 3s ease-in-out infinite`,
    animationDelay: '${props => Math.random() * 3}s',
  },
});

// Père Noël stylisé
const SantaClaus = styled(({ className, size = 70, style }) => (
  <div className={className} style={style}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="30" r="20" fill="#ffcdd2" />
      <path d="M30 30 Q50 10 70 30 L65 80 L35 80 Z" fill="#d32f2f" />
      <path d="M35 35 L65 35 L65 40 L35 40 Z" fill="#ffffff" />
      <circle cx="40" cy="25" r="2" fill="#000" />
      <circle cx="60" cy="25" r="2" fill="#000" />
      <path d="M45 30 Q50 35 55 30" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 50 L35 60 L45 65 Z" fill="#ff9800" />
      <path d="M60 50 L65 60 L55 65 Z" fill="#ff9800" />
    </svg>
  </div>
))({
  '& svg': {
    filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.2))',
  },
});

// Cadeau de Noël
const Gift = styled(({ className, size = 50, style }) => (
  <div className={className} style={style}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="25" y="30" width="50" height="40" fill="#e91e63" />
      <rect x="45" y="30" width="10" height="40" fill="#c2185b" />
      <rect x="25" y="60" width="50" height="10" fill="#c2185b" />
      <rect x="25" y="30" width="50" height="10" fill="#c2185b" />
      <rect x="40" y="20" width="20" height="10" fill="#4caf50" />
    </svg>
  </div>
))({
  '& svg': {
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
  },
  animation: `${float} 4s ease-in-out infinite`,
  animationDelay: '${props => Math.random() * 2}s',
});

// Boule de Noël
const Ornament = styled(({ className, color = '#2196f3', size = 30, style }) => (
  <div className={className} style={style}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill={color} />
      <circle cx="50" cy="40" r="5" fill="#fff" opacity="0.3" />
      <path d="M50 10 L55 20 L65 15 L60 25 L70 30 L60 35 L65 45 L55 40 L50 50 L45 40 L35 45 L40 35 L30 30 L40 25 L35 15 L45 20 Z" 
        fill="#ffd700" 
        opacity="0.8"
      />
    </svg>
  </div>
))({
  '& svg': {
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
  },
  'circle': {
    animation: `${twinkle} 3s ease-in-out infinite`,
    animationDelay: '${props => Math.random() * 3}s',
  },
});

// Génère une position aléatoire
const getRandomPosition = (min, max) => Math.random() * (max - min) + min;

// Génère une taille aléatoire
const getRandomSize = (min, max) => Math.random() * (max - min) + min;

// Composant principal
const FestiveDecorations = () => {
  const colors = ['#2196f3', '#f44336', '#4caf50', '#ff9800', '#9c27b0'];
  
  // Générer des positions aléatoires pour les décorations
  const decorations = [
    // Grands éléments (sapins, Père Noël)
    {
      component: ChristmasTree,
      props: { 
        size: getRandomSize(80, 120),
        style: {
          top: `${getRandomPosition(5, 20)}%`,
          left: `${getRandomPosition(5, 20)}%`,
          zIndex: 1,
          animationDuration: `${getRandomSize(8, 12)}s`,
          position: 'fixed'
        }
      }
    },
    {
      component: SantaClaus,
      props: {
        size: getRandomSize(60, 90),
        style: {
          top: `${getRandomPosition(5, 20)}%`,
          right: `${getRandomPosition(5, 20)}%`,
          zIndex: 10,
          animationDuration: `${getRandomSize(10, 15)}s`,
          position: 'fixed'
        }
      }
    },
    // Ajouter des sapins supplémentaires
    ...Array(2).fill().map((_, i) => ({
      component: ChristmasTree,
      props: {
        size: getRandomSize(50, 80),
        style: {
          top: `${getRandomPosition(20, 80)}%`,
          left: `${getRandomPosition(70, 90)}%`,
          zIndex: 1,
          animationDuration: `${getRandomSize(10, 15)}s`,
          position: 'fixed',
          opacity: 0.8
        }
      }
    })),
    // Ajouter des cadeaux
    ...Array(5).fill().map((_, i) => ({
      component: Gift,
      props: {
        size: getRandomSize(40, 70),
        style: {
          top: `${getRandomPosition(20, 80)}%`,
          left: `${getRandomPosition(5, 95)}%`,
          zIndex: 2,
          animationDuration: `${getRandomSize(5, 10)}s`,
          position: 'fixed',
          transform: `rotate(${getRandomPosition(0, 45)}deg)`
        }
      }
    })),
    // Ajouter des boules de Noël
    ...Array(15).fill().map((_, i) => ({
      component: Ornament,
      props: {
        color: colors[Math.floor(Math.random() * colors.length)],
        size: getRandomSize(20, 50),
        style: {
          top: `${getRandomPosition(5, 95)}%`,
          left: `${getRandomPosition(5, 95)}%`,
          zIndex: 2,
          animationDuration: `${getRandomSize(5, 15)}s`,
          animationDelay: `${getRandomSize(0, 5)}s`,
          position: 'fixed',
          opacity: getRandomSize(0.7, 1)
        }
      }
    }))
  ];
  
  return (
    <>
      {decorations.map(({ component: Component, props }, index) => (
        <Component key={index} {...props} />
      ))}
    </>
  );
};

export default FestiveDecorations;
