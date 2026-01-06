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

  const handleClose = (event, reason) => {
    // Empêcher la fermeture en cliquant en dehors ou avec la touche Échap
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    onClose();
  };

  const handleConfirm = () => {
    onClose();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    onClose();
    if (onCancel) onCancel();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)'
            : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
            : '0 20px 60px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton 
          onClick={handleCancel}
          size="small"
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogTitle id="alert-dialog-title" sx={{ pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getIcon()}
          <Typography 
            variant="h6" 
            component="span"
            sx={{
              fontWeight: 600,
            }}
          >
            {getTitle()}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 2, gap: 2 }}>
        {showCancelButton && (
          <Button 
            onClick={handleCancel}
            variant="outlined"
            fullWidth
            sx={{ 
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            {cancelText}
          </Button>
        )}
        <Button 
          onClick={handleConfirm}
          variant="contained" 
          color={severity === 'error' ? 'error' : 'primary'}
          autoFocus
          fullWidth
          sx={{ 
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomAlert;
