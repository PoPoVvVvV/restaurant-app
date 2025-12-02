import React, { useEffect, useRef, useMemo } from 'react';
import { keyframes, styled } from '@mui/material/styles';

const createFallAnimation = (drift) => keyframes`
  0% {
    transform: translateY(-10%) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(110vh) translateX(${drift}px) rotate(360deg);
    opacity: 0;
  }
`;

const SnowflakeBase = styled('div')({
  position: 'fixed',
  color: 'rgba(255, 255, 255, 0.9)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1,
  textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
  willChange: 'transform, opacity',
  filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))',
});

// Composant de flocon individuel mémorisé
const Snowflake = React.memo(({ left, top, size, opacity, duration, delay, drift, rotation, index }) => {
  const FallAnimation = React.useMemo(() => {
    return styled(SnowflakeBase)(() => ({
      animation: `${createFallAnimation(drift)} ${duration}s linear ${delay}s infinite`,
    }));
  }, [drift, duration, delay]);

  return (
    <FallAnimation
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity,
        fontSize: `${size}px`,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        zIndex: 1,
        willChange: 'transform, opacity',
        filter: `blur(${size > 20 ? '1.5px' : '0.5px'})`,
        transform: `rotate(${rotation}deg)`
      }}
      aria-hidden="true"
    >
      {['❄', '❅', '❆'][index % 3]}
    </FallAnimation>
  );
});

const Snowflakes = React.memo(({ count = 100 }) => {
  const snowflakesRef = useRef([]);
  const animationFrameId = useRef(null);

  useEffect(() => {
    const snowflakes = snowflakesRef.current;
    
    const updateSnowflakes = () => {
      snowflakes.forEach(snowflake => {
        if (!snowflake) return;
        
        // Réinitialiser la position si le flocon est sorti de l'écran
        const rect = snowflake.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          snowflake.style.top = `${-10}px`;
          snowflake.style.left = `${Math.random() * 100}%`;
          // Forcer un reflow avant de réinitialiser l'animation
          const resetAnimation = () => {
            snowflake.style.animation = 'none';
            void snowflake.offsetHeight; // Utilisation de void pour éviter l'avertissement
            snowflake.style.animation = '';
          };
          resetAnimation();
        }
      });
      
      animationFrameId.current = requestAnimationFrame(updateSnowflakes);
    };
    
    // Démarrer l'animation
    animationFrameId.current = requestAnimationFrame(updateSnowflakes);
    
    // Nettoyer l'animation lors du démontage
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Génération des données des flocons une seule fois avec useMemo
  const snowflakesData = useMemo(() => {
    return Array.from({ length: count }).map((_, index) => ({
      id: index,
      size: Math.random() * 25 + 10,
      left: Math.random() * 100,
      top: -20,
      opacity: Math.random() * 0.8 + 0.2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * -20,
      drift: (Math.random() - 0.5) * 200,
      rotation: Math.random() * 360,
    }));
  }, [count]);

  return (
    <>
      {snowflakesData.map((flake, index) => (
        <Snowflake
          key={flake.id}
          ref={el => snowflakesRef.current[index] = el}
          index={index % 3}
          {...flake}
        />
      ))}
    </>
  );
});

// Désactiver les logs en production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

export default Snowflakes;
