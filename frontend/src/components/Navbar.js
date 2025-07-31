import React, { useContext } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box, Divider } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AuthContext from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import logo from '../assets/Popov.png'; // Assurez-vous que le chemin vers votre logo est correct

const NavButton = ({ to, icon, text }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Button 
      color="inherit" 
      component={RouterLink} 
      to={to} 
      startIcon={<span>{icon}</span>}
      sx={{
        backgroundColor: isActive ? 'success.dark' : 'transparent',
        '&:hover': {
          backgroundColor: isActive ? 'success.main' : 'rgba(255, 255, 255, 0.08)',
        },
        borderRadius: 2,
        mx: 0.5,
        fontSize: { xs: '0.65rem', md: '0.875rem' },
        px: { xs: 1, md: 2 }
      }}
    >
      {text}
    </Button>
  );
};

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Box 
          component="img"
          sx={{ height: 40, mr: 2 }}
          alt="Logo Delight"
          src={logo}
        />
        <Typography variant="h6" component="div">
          Delight
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {user && (
                 <>
                    <NavButton to="/ventes" icon="🛍️" text="Ventes" />
                    <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <NavButton to="/ventes-entreprises" icon="🏢" text="Ventes Entreprises" />
                    <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <NavButton to="/stocks" icon="📦" text="Stocks" />
                    <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <NavButton to="/recettes" icon="📖" text="Recettes" />
                    <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <NavButton to="/absences" icon="📅" text="Absences" />
                    <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <NavButton to="/comptabilite" icon="📊" text="Ma Compta" />
                    {user.role === 'admin' && (
                        <>
                        <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                        <NavButton to="/admin" icon="⚙️" text="Admin" />
                        </>
                    )}
                </>
            )}
        </Box>

        {user ? (
          <>
            <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>{user.username}</Typography>
            <Button color="inherit" onClick={onLogout}>Déconnexion</Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={RouterLink} to="/login">Connexion</Button>
            <Button color="inherit" component={RouterLink} to="/register">S'inscrire</Button>
          </>
        )}
        
        <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;