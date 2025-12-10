import React, { useEffect, useRef, useMemo } from 'react';
import { styled } from '@mui/material/styles';

// Style de base pour les flocons
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

// Composant Snowflake simplifié
const Snowflake = React.memo(({ left, top, size, opacity, index }) => {
  const snowflakeRef = useRef(null);
  const animationRef = useRef({
    x: 0,
    y: top,
    rotation: 0,
    speed: Math.random() * 2 + 1,
    drift: (Math.random() - 0.5) * 2
  });

  // Style du flocon
  const snowflakeStyle = useMemo(() => ({
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    opacity,
    fontSize: `${size}px`,
    mixBlendMode: 'screen',
    filter: `blur(${size > 20 ? '1.5px' : '0.5px'})`,
    transform: `rotate(${animationRef.current.rotation}deg)`
  }), [left, top, size, opacity]);

  // Animation du flocon
  useEffect(() => {
    let animationId;
    const animate = () => {
      const anim = animationRef.current;
      anim.y += anim.speed;
      anim.x += Math.sin(anim.y * 0.01) * 0.5;
      anim.rotation += 0.5;

      if (snowflakeRef.current) {
        snowflakeRef.current.style.transform = `translate3d(${anim.x}px, ${anim.y}px, 0) rotate(${anim.rotation}deg)`;
      }

      // Réinitialiser la position si le flocon sort de l'écran
      if (anim.y > window.innerHeight) {
        anim.y = -20;
        anim.x = Math.random() * window.innerWidth;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <SnowflakeBase ref={snowflakeRef} style={snowflakeStyle} aria-hidden="true">
      {['❄', '❅', '❆'][index % 3]}
    </SnowflakeBase>
  );
});

const Snowflakes = React.memo(({ count = 30 }) => {
  // Génération des flocons
  const snowflakes = useMemo(() => {
    return Array.from({ length: count }).map((_, index) => {
      const size = Math.random() * 20 + 5;
      return (
        <Snowflake
          key={`snowflake-${index}`}
          left={Math.random() * 100}
          top={Math.random() * 100}
          size={size}
          opacity={Math.random() * 0.5 + 0.5}
          index={index % 3}
        />
      );
    });
  }, [count]);

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
