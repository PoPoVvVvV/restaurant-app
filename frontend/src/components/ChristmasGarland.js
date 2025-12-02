import React from 'react';
import { keyframes, styled } from '@mui/material/styles';

// Animation pour les lumières
const twinkle = keyframes`
  0%, 100% { opacity: 0.5; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.5); }
`;

const GarlandContainer = styled('div')({
  position: 'absolute',
  bottom: '-10px',
  left: 0,
  right: 0,
  height: '20px',
  overflow: 'hidden',
  zIndex: 1100,
});

const Light = styled('span')({
  position: 'absolute',
  bottom: '0',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  animation: `${twinkle} ${props => props.speed || '1s'} ease-in-out infinite`,
  animationDelay: props => props.delay || '0s',
  boxShadow: '0 0 10px 2px',
  transform: 'translateX(-50%)',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '4px',
    height: '15px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: 'translate(-50%, -100%)',
  }
});

const Wire = styled('div')({
  position: 'absolute',
  bottom: '4px',
  left: 0,
  right: 0,
  height: '2px',
  backgroundColor: 'rgba(200, 160, 100, 0.3)',
  zIndex: 1099,
});

const ChristmasGarland = () => {
  // Couleurs des lumières de Noël
  const lightColors = [
    '#ff0000', // Rouge
    '#00ff00', // Vert
    '#ffff00', // Jaune
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ff8000', // Orange
  ];

  // Créer 30 lumières réparties sur la largeur de l'écran
  const lights = Array.from({ length: 30 }).map((_, i) => {
    const color = lightColors[Math.floor(Math.random() * lightColors.length)];
    const position = (i / 29) * 100; // Position en pourcentage
    const size = Math.random() * 10 + 8; // Taille aléatoire entre 8 et 18px
    const speed = `${Math.random() * 0.5 + 0.5}s`; // Vitesse d'animation aléatoire
    const delay = `${Math.random() * 2}s`; // Délai d'animation aléatoire
    
    return {
      id: i,
      position,
      color,
      size,
      speed,
      delay
    };
  });

  return (
    <GarlandContainer>
      <Wire />
      {lights.map(light => (
        <Light
          key={light.id}
          style={{
            left: `${light.position}%`,
            backgroundColor: light.color,
            boxShadow: `0 0 10px 2px ${light.color}`,
            width: `${light.size}px`,
            height: `${light.size}px`,
          }}
          speed={light.speed}
          delay={light.delay}
        />
      ))}
    </GarlandContainer>
  );
};

export default ChristmasGarland;
