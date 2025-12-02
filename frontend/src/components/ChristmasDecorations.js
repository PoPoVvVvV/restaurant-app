import React from 'react';
import { keyframes, styled } from '@mui/material/styles';

// Animation pour les décorations
const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Styles pour les décorations
const Decoration = styled('div')({
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 2,
  animation: `${float} 3s ease-in-out infinite`,
  opacity: 0,
  animationName: `${fadeIn}, ${float}`,
  animationDuration: '1s, 3s',
  animationFillMode: 'forwards',
  animationIterationCount: '1, infinite',
});

const SantaHat = styled(Decoration)({
  top: '10px',
  right: '20px',
  fontSize: '60px',
  zIndex: 1000,
});

const Tree = styled(Decoration)({
  bottom: '10px',
  left: '20px',
  fontSize: '80px',
  zIndex: 1,
});

const Gift = styled(Decoration)({
  bottom: '20px',
  right: '30px',
  fontSize: '40px',
});

const ChristmasDecorations = () => {
  return (
    <>
      <SantaHat style={{ right: '2%', top: '1%' }}>🎅</SantaHat>
      <Tree style={{ left: '2%', bottom: '2%' }}>🎄</Tree>
      <Gift style={{ right: '5%', bottom: '5%' }}>🎁</Gift>
      <Gift style={{ left: '5%', bottom: '10%' }}>🎄</Gift>
      <Gift style={{ right: '15%', top: '20%' }}>🔔</Gift>
      <Gift style={{ left: '15%', top: '15%' }}>🦌</Gift>
    </>
  );
};

export default ChristmasDecorations;
