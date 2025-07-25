import React, { useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box, Divider } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AuthContext from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';

const NavButton = ({ to, icon, text }) => (
  <Button color="inherit" component={RouterLink} to={to} startIcon={<span>{icon}</span>}>
    {text}
  </Button>
);

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
        <Typography variant="h6" component="div">
          Delight
        </Typography>

        {/* CONTENEUR DES LIENS CENTRÉS */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            display: { xs: 'none', md: 'flex' }, 
            justifyContent: 'center', // Centre les éléments horizontalement
            alignItems: 'center'
          }}
        >
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
            <Typography sx={{ mr: 2 }}>{user.username}</Typography>
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