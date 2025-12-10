import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { keyframes, styled } from '@mui/material/styles';

// Animation simplifiée pour éviter les erreurs de syntaxe
const fallAnimation = keyframes`
  from {
    transform: translateY(-10%) translateX(0) rotate(0deg);
    opacity: 0;
  }
  to {
    transform: translateY(110vh) translateX(50px) rotate(360deg);
    opacity: 0;
  }
`;

// Styles de base optimisés
const SnowflakeBase = styled('div')({
  position: 'fixed',
  color: 'rgba(255, 255, 255, 0.9)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1,
  textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
  willChange: 'transform, opacity',
  filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  transform: 'translateZ(0)',
  WebkitTransform: 'translateZ(0)'
});

// Mémorisation du composant Snowflake avec une fonction de comparaison personnalisée
const Snowflake = React.memo(({ left, top, size, opacity, duration, delay, drift, rotation, index }) => {
  // Pas besoin de mémoriser séparément l'animation
  // car elle est maintenant directement dans le style

  // Styles mémorisés
  const snowflakeStyle = useMemo(() => ({
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    opacity,
    fontSize: `${size}px`,
    mixBlendMode: 'screen',
    filter: `blur(${size > 20 ? '1.5px' : '0.5px'})`,
    transform: `rotate(${rotation}deg)`,
    animation: `${fallAnimation} ${duration}s linear ${delay}s infinite`
  }), [left, top, size, opacity, rotation, duration, delay]);

  return (
    <SnowflakeBase style={snowflakeStyle} aria-hidden="true">
      {['❄', '❅', '❆'][index % 3]}
    </SnowflakeBase>
  );
}, (prevProps, nextProps) => {
  // Optimisation: ne pas re-rendre si les props n'ont pas changé
  return (
    prevProps.left === nextProps.left &&
    prevProps.top === nextProps.top &&
    prevProps.size === nextProps.size &&
    prevProps.opacity === nextProps.opacity &&
    prevProps.duration === nextProps.duration &&
    prevProps.delay === nextProps.delay &&
    prevProps.drift === nextProps.drift &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.index === nextProps.index
  );
});

const Snowflakes = React.memo(({ count = 100 }) => {
  const snowflakesRef = useRef([]);
  const animationFrameId = useRef(null);
  const lastUpdateTime = useRef(0);
  const updateInterval = 16; // ~60fps

  // Fonction simplifiée pour réinitialiser un flocon
  const resetSnowflake = useCallback((snowflake) => {
    if (!snowflake) return;
    
    snowflake.style.top = `${-10}px`;
    snowflake.style.left = `${Math.random() * 100}%`;
  }, []);

  // Fonction de mise à jour simplifiée
  const updateSnowflakes = useCallback(() => {
    if (!snowflakesRef.current.length) return;
    
    const viewportHeight = window.innerHeight;
    const snowflakes = snowflakesRef.current;
    
    for (let i = 0; i < snowflakes.length; i++) {
      const snowflake = snowflakes[i];
      if (!snowflake) continue;
      
      const rect = snowflake.getBoundingClientRect();
      if (rect.top > viewportHeight) {
        resetSnowflake(snowflake);
      }
    }
    
    animationFrameId.current = requestAnimationFrame(updateSnowflakes);
  }, [resetSnowflake]);

  useEffect(() => {
    // Démarrer l'animation
    animationFrameId.current = requestAnimationFrame(updateSnowflakes);
    
    // Nettoyage
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [updateSnowflakes]);
  
  // Réduire le nombre de flocons pour les performances
  const flakeCount = Math.min(count, 50);

  // Génération des flocons avec useMemo pour éviter les recréations inutiles
  const snowflakes = useMemo(() => {
    return Array.from({ length: flakeCount }).map((_, index) => {
      const size = Math.random() * 20 + 5;
      return (
        <Snowflake
          key={`snowflake-${index}`}
          ref={(el) => (snowflakesRef.current[index] = el)}
          left={Math.random() * 100}
          top={Math.random() * 100}
          size={size}
          opacity={Math.random() * 0.5 + 0.5}
          duration={Math.random() * 10 + 5}
          delay={Math.random() * 5}
          drift={Math.random() * 100 - 50}
          rotation={Math.random() * 360}
          index={index % 3}
        />
      );
    });
  }, [flakeCount]);

  // Utilisation de React.Fragment pour éviter un nœud DOM supplémentaire
  return <>{snowflakes}</>;
}, (prevProps, nextProps) => {
  // Ne pas re-rendre si le nombre de flocons n'a pas changé
  return prevProps.count === nextProps.count;
});

// Désactiver les logs en production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Ajout d'un displayName pour le débogage
Snowflakes.displayName = 'Snowflakes';

export default Snowflakes;
