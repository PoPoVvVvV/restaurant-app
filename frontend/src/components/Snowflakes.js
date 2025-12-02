import React, { useEffect, useRef } from 'react';
import { keyframes, styled } from '@mui/material/styles';

const fallAnimation = keyframes`
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
    transform: translateY(110vh) translateX(50px) rotate(360deg);
    opacity: 0;
  }
`;

const Snowflake = styled('div')({
  position: 'fixed',
  color: 'rgba(255, 255, 255, 0.9)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1,
  textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
  willChange: 'transform, opacity',
  filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))',
});

const Snowflakes = ({ count = 150 }) => {
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

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const size = Math.random() * 25 + 10; // Taille plus grande
        const left = Math.random() * 100;
        const top = Math.random() * 100 - 20;
        const opacity = Math.random() * 0.8 + 0.2;
        const duration = Math.random() * 10 + 10; // Chute plus rapide
        const delay = Math.random() * -20;
        const drift = (Math.random() - 0.5) * 100; // Dérive horizontale
        
        return (
          <Snowflake
            key={index}
            ref={el => snowflakesRef.current[index] = el}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: 1,
              animation: `
                ${fallAnimation} ${duration}s linear ${delay}s infinite
              `,
              fontSize: `${size}px`,
              pointerEvents: 'none',
              mixBlendMode: 'screen',
              zIndex: 1,
              willChange: 'transform, opacity',
              filter: `blur(${size > 20 ? '1.5px' : '0.5px'})`,
              transform: `translateX(${drift}px)`
            }}
            aria-hidden="true"
          >
            {['❄', '❅', '❆'][Math.floor(Math.random() * 3)]}
          </Snowflake>
        );
      })}
    </>
  );
};

export default Snowflakes;
