import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

const CustomAlert = ({ 
  open, 
  onClose, 
  title, 
  message, 
  severity = 'info',
  showCancelButton = false,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Annuler'
}) => {
  const getIcon = () => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />;
      case 'error':
        return <ErrorIcon color="error" sx={{ fontSize: 40, mr: 2 }} />;
      case 'warning':
        return <WarningIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />;
      default:
        return <InfoIcon color="info" sx={{ fontSize: 40, mr: 2 }} />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (severity) {
      case 'success':
        return 'Succès';
      case 'error':
        return 'Erreur';
      case 'warning':
        return 'Avertissement';
      default:
        return 'Information';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogTitle id="alert-dialog-title" sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getIcon()}
          <Typography variant="h6" component="span">
            {getTitle()}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
        {showCancelButton && (
          <Button 
            onClick={() => {
              onClose();
              onCancel?.();
            }} 
            variant="outlined"
          >
            {cancelText}
          </Button>
        )}
        <Button 
          onClick={() => {
            onClose();
            onConfirm?.();
          }} 
          variant="contained" 
          color={severity === 'error' ? 'error' : 'primary'}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomAlert;
