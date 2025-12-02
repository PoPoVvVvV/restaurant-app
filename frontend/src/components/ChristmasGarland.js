import React from 'react';
import { keyframes, styled } from '@mui/material/styles';

// Animation pour les lumières - Effet d'allumage progressif
const lightUp = keyframes`
  0% { 
    opacity: 0.1; 
    filter: brightness(0.3) blur(1px);
    box-shadow: 0 0 5px 1px currentColor;
  }
  10% {
    opacity: 0.2;
    filter: brightness(0.5) blur(0.8px);
  }
  20% {
    opacity: 0.4;
    filter: brightness(0.8) blur(0.5px);
  }
  30% {
    opacity: 0.7;
    filter: brightness(1.2) blur(0.3px);
    box-shadow: 0 0 15px 3px currentColor;
  }
  40% {
    opacity: 1;
    filter: brightness(1.5) blur(0.1px);
  }
  50% {
    opacity: 0.9;
    filter: brightness(1.8) blur(0px);
    box-shadow: 0 0 20px 5px currentColor;
  }
  60% {
    opacity: 1;
    filter: brightness(1.5) blur(0.1px);
  }
  70% {
    opacity: 0.8;
    filter: brightness(1.2) blur(0.3px);
    box-shadow: 0 0 15px 3px currentColor;
  }
  80% {
    opacity: 0.5;
    filter: brightness(0.8) blur(0.5px);
  }
  90% {
    opacity: 0.3;
    filter: brightness(0.5) blur(0.8px);
  }
  100% { 
    opacity: 0.1; 
    filter: brightness(0.3) blur(1px);
    box-shadow: 0 0 5px 1px currentColor;
  }
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

const LightBase = styled('span')(props => ({
  position: 'absolute',
  bottom: '0',
  width: props.size || '12px',
  height: props.size || '12px',
  borderRadius: '50%',
  backgroundColor: props.color || '#fff',
  animation: `${lightUp} ${props.speed || '2s'} cubic-bezier(0.4, 0, 0.6, 1) infinite`,
  animationDelay: props.delay || '0s',
  boxShadow: `0 0 ${props.size || '12px'} ${Math.floor((parseInt(props.size) || 12) / 4)}px ${props.color || '#fff'}`,
  transform: 'translateX(-50%) scale(1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateX(-50%) scale(1.2)',
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '3px',
    height: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: 'translate(-50%, -100%)',
    filter: 'blur(1px)'
  }
}));

const Wire = styled('div')({
  position: 'absolute',
  bottom: '4px',
  left: 0,
  right: 0,
  height: '2px',
  backgroundColor: 'rgba(200, 160, 100, 0.3)',
  zIndex: 1099,
});

// Composant de lumière individuel mémorisé
const Light = React.memo(({ id, position, color, size, speed, delay }) => {
  const lightStyle = React.useMemo(() => ({
    left: `${position}%`,
    backgroundColor: color,
    boxShadow: `0 0 ${size} ${Math.floor(parseInt(size) / 4)}px ${color}`,
    width: size,
    height: size,
  }), [position, color, size]);

  return (
    <LightBase
      style={lightStyle}
      color={color}
      size={size}
      speed={speed}
      delay={delay}
      aria-hidden="true"
    />
  );
});

const ChristmasGarland = React.memo(() => {
  // Couleurs des lumières de Noël (déplacé en dehors du composant pour éviter les recréations)
  const lightColors = React.useMemo(() => [
    '#ff0000', // Rouge
    '#00aa00', // Vert plus doux
    '#ffcc00', // Jaune plus doux
    '#cc00cc', // Magenta plus doux
    '#00cccc', // Cyan plus doux
    '#ff6600', // Orange plus doux
  ], []);

  // Génération des données des lumières avec useMemo
  const lights = React.useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const color = lightColors[Math.floor(Math.random() * lightColors.length)];
      const position = (i / 24) * 100; // Position en pourcentage
      const size = `${Math.random() * 6 + 10}px`; // Taille aléatoire entre 10 et 16px
      const speed = `${Math.random() * 3 + 2}s`; // Vitesse d'animation aléatoire plus lente
      
      // Créer des groupes de lumières qui s'allument en séquence
      const groupSize = 5;
      const groupIndex = Math.floor(i / groupSize);
      const inGroupIndex = i % groupSize;
      const groupDelay = groupIndex * 0.5;
      
      return {
        id: i,
        position,
        color,
        size,
        speed,
        delay: `${(Math.random() * 0.5) + (inGroupIndex * 0.2) + groupDelay}s`
      };
    });
  }, [lightColors]);

  return (
    <GarlandContainer>
      <Wire />
      {lights.map(light => (
        <Light
          key={light.id}
          id={light.id}
          position={light.position}
          color={light.color}
          size={light.size}
          speed={light.speed}
          delay={light.delay}
        />
      ))}
    </GarlandContainer>
  );
});

// Désactiver les logs en production
if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  if (typeof console !== 'undefined') {
    ['log', 'warn', 'error'].forEach(method => {
      console[method] = noop;
    });
  }
}

export default ChristmasGarland;
