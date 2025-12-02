import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import SnakeGame from './SnakeGame';

const SnakeGameWrapper = () => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="Jouer au Snake" arrow>
        <IconButton
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: '#00c853',
            color: 'white',
            '&:hover': {
              backgroundColor: '#00e676',
              transform: 'scale(1.1)',
              transition: 'all 0.2s ease-in-out',
            },
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}
          size="large"
        >
          <VideogameAssetIcon />
        </IconButton>
      </Tooltip>
      
      <SnakeGame open={open} onClose={handleClose} />
    </>
  );
};

export default SnakeGameWrapper;
