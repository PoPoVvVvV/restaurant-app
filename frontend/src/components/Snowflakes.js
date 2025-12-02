import React, { useEffect, useRef } from 'react';
import { keyframes, styled } from '@mui/material/styles';

const fallAnimation = keyframes`
  to {
    transform: translateY(100vh);
  }
`;

const Snowflake = styled('div')({
  position: 'fixed',
  color: '#fff',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1000,
  animation: `${fallAnimation} linear forwards`,
});

const Snowflakes = ({ count = 50 }) => {
  const snowflakesRef = useRef([]);

  useEffect(() => {
    const snowflakes = snowflakesRef.current;
    
    const updateSnowflakes = () => {
      snowflakes.forEach(snowflake => {
        if (!snowflake) return;
        
        const x = parseFloat(snowflake.style.left);
        const y = parseFloat(snowflake.style.top);
        const size = parseFloat(snowflake.style.width);
        
        // Mouvement de chute avec oscillation latérale
        const xOffset = Math.sin((y / 100) + (size * 10)) * 2;
        
        snowflake.style.transform = `translate(${xOffset}px, ${y + 1}px)`;
        
        // Réinitialiser la position si le flocon est sorti de l'écran
        if (y > window.innerHeight) {
          snowflake.style.top = `${-10}px`;
          snowflake.style.left = `${Math.random() * 100}%`;
        } else {
          snowflake.style.top = `${y + 1}px`;
          snowflake.style.left = `${x + xOffset}px`;
        }
      });
      
      requestAnimationFrame(updateSnowflakes);
    };
    
    const animationId = requestAnimationFrame(updateSnowflakes);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const size = Math.random() * 10 + 5;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const opacity = Math.random() * 0.5 + 0.5;
        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * -20;
        
        return (
          <Snowflake
            key={index}
            ref={el => snowflakesRef.current[index] = el}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              fontSize: `${size}px`,
            }}
          >
            ❄
          </Snowflake>
        );
      })}
    </>
  );
};

export default Snowflakes;
