import React, { useContext, useMemo, useCallback, memo, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Button, IconButton, Box, Tooltip,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import AuthContext from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useEasterEgg } from '../context/EasterEggContext';
import logo from '../assets/Popov.png';

const Navbar = memo(() => {
  const { user, logout } = useContext(AuthContext);
  const { mode, toggleTheme } = useThemeMode();
  const { recordClick, isEasterEggUnlocked } = useEasterEgg();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const onLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleLogoClick = useCallback(() => {
    recordClick('logo');
  }, [recordClick]);

  const toggleDrawer = useCallback((open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  }, []);

  const navItems = useMemo(() => {
    const baseItems = [
      { path: '/ventes', label: 'Ventes', icon: '🛍️' },
      { path: '/ventes-entreprises', label: 'Ventes Entreprises', icon: '🏢' },
      { path: '/stocks', label: 'Stocks', icon: '📦' },
      { path: '/recettes', label: 'Recettes', icon: '📖' },
      { path: '/absences', label: 'Absences', icon: '📅' },
      { path: '/comptabilite', label: 'Ma Compta', icon: '📊' },
    ];

    if (user?.role === 'admin') {
      return [
        ...baseItems,
        { path: '/admin', label: 'Admin', icon: '⚙️' }
      ];
    }

    return baseItems;
  }, [user?.role]);

  const renderLogo = useMemo(() => (
    <Box 
      component="img"
      sx={{ 
        height: 40, 
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.05)'
        }
      }}
      alt="Logo Delight"
      src={logo}
      onClick={handleLogoClick}
      loading="lazy"
    />
  ), [handleLogoClick]);

  const handleNavItemClick = useCallback((path, clickType) => {
    if (clickType) {
      recordClick(clickType);
    }
    setDrawerOpen(false);
    navigate(path);
  }, [recordClick, navigate]);

  const renderDrawerContent = useMemo(() => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {user ? (
          <>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => handleNavItemClick(item.path, item.label.toLowerCase())}
                    sx={{
                      backgroundColor: isActive ? 'success.dark' : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive ? 'success.main' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
            {isEasterEggUnlocked && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={location.pathname === '/easter-eggs'}
                  onClick={() => handleNavItemClick('/easter-eggs')}
                  sx={{
                    backgroundColor: location.pathname === '/easter-eggs' ? 'success.dark' : 'transparent',
                    '&:hover': {
                      backgroundColor: location.pathname === '/easter-eggs' ? 'success.main' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <span style={{ fontSize: '1.2rem' }}>🎮</span>
                  </ListItemIcon>
                  <ListItemText primary="Easter-Eggs" />
                </ListItemButton>
              </ListItem>
            )}
          </>
        ) : null}
      </List>
    </Box>
  ), [user, navItems, isEasterEggUnlocked, location.pathname, handleNavItemClick, toggleDrawer]);

  const renderAuthButtons = useMemo(() => (
    user ? (
      <>
        <Typography 
          sx={{ 
            mr: 2, 
            display: { xs: 'none', sm: 'block' },
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 150
          }}
        >
          {user.username}
        </Typography>
        <Button 
          color="inherit" 
          onClick={onLogout}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Déconnexion
        </Button>
      </>
    ) : (
      <>
        <Button 
          color="inherit" 
          component={RouterLink} 
          to="/login"
          sx={{ mr: 1 }}
        >
          Connexion
        </Button>
        <Button 
          color="inherit" 
          component={RouterLink} 
          to="/register"
          variant="outlined"
          sx={{
            borderColor: 'inherit',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          S'inscrire
        </Button>
      </>
    )
  ), [user, onLogout]);

  return (
    <>
      <AppBar 
        position="static" 
        color="primary" 
        elevation={0} 
        sx={{ 
          position: 'relative',
          background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
          boxShadow: '0 3px 5px 2px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar disableGutters sx={{ px: { xs: 1, sm: 2 } }}>
          {/* Menu hamburger à gauche */}
          {user && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo et nom Delight centrés */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: 1
            }}
          >
            {renderLogo}
            <Typography 
              variant="h6" 
              component="div"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #fff 30%, #e0e0e0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Delight
            </Typography>
          </Box>
        
          {/* Boutons d'authentification et thème à droite */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {renderAuthButtons}
            
            <Tooltip title={mode === 'dark' ? 'Mode clair' : 'Mode sombre'}>
              <IconButton 
                onClick={toggleTheme} 
                color="inherit"
                sx={{
                  ml: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'rotate(30deg)',
                    transition: 'transform 0.3s ease-in-out'
                  }
                }}
              >
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer (menu déroulant) */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {renderDrawerContent}
      </Drawer>
    </>
  );
});

// Configuration de displayName pour le débogage
Navbar.displayName = 'Navbar';

export default Navbar;