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
import AdminNotificationsMenu from './AdminNotificationsMenu';
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
      { path: '/notes-de-frais', label: 'Note de Frais', icon: '💰' },
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
                      borderRadius: 2,
                      mx: 1,
                      my: 0.5,
                      backgroundColor: isActive 
                        ? (theme) => theme.palette.mode === 'dark'
                          ? 'rgba(99, 102, 241, 0.2)'
                          : 'rgba(99, 102, 241, 0.1)'
                        : 'transparent',
                      border: isActive
                        ? (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`
                        : '1px solid transparent',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                          ? 'rgba(99, 102, 241, 0.15)'
                          : 'rgba(99, 102, 241, 0.08)',
                        transform: 'translateX(4px)',
                        border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)'}`,
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
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    backgroundColor: location.pathname === '/easter-eggs'
                      ? (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(236, 72, 153, 0.2)'
                        : 'rgba(236, 72, 153, 0.1)'
                      : 'transparent',
                    border: location.pathname === '/easter-eggs'
                      ? (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)'}`
                      : '1px solid transparent',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(236, 72, 153, 0.15)'
                        : 'rgba(236, 72, 153, 0.08)',
                      transform: 'translateX(4px)',
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
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(99, 102, 241, 0.25)',
          borderBottom: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(255, 255, 255, 0.2)',
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
                fontWeight: 800,
                fontSize: '1.5rem',
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' },
                letterSpacing: '-0.02em',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              Delight
            </Typography>
          </Box>
        
          {/* Boutons d'authentification et thème à droite */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {renderAuthButtons}

            {/* Onglet Notifications (icône + badge + menu déroulant) */}
            <AdminNotificationsMenu />
            
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
        PaperProps={{
          sx: {
            width: 280,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            borderRight: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(148, 163, 184, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
          },
        }}
      >
        {renderDrawerContent}
      </Drawer>
    </>
  );
});

// Configuration de displayName pour le débogage
Navbar.displayName = 'Navbar';

export default Navbar;