import React, { useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AuthContext from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

function Navbar({ mode }) {
  const { user, logout } = useContext(AuthContext);
  const { toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div">
          Resto-App
        </Typography>

        {/* Espacement pour pousser les boutons de navigation */}
        <Box sx={{ flexGrow: 1, pl: 2 }}>
            {user && (
                 <>
                    <Button color="inherit" component={RouterLink} to="/ventes">Ventes</Button>
                    <Button color="inherit" component={RouterLink} to="/ventes-entreprises">Vente Entreprise</Button>
                    <Button color="inherit" component={RouterLink} to="/stocks">Stocks</Button>
                    <Button color="inherit" component={RouterLink} to="/recettes">Recettes</Button>
                    <Button color="inherit" component={RouterLink} to="/comptabilite">Ma Comptabilité</Button>
                    {user.role === 'admin' && (
                        <Button color="inherit" component={RouterLink} to="/admin">Admin</Button>
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