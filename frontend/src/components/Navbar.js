import React, { useContext, useMemo, useCallback, memo } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box, Divider, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AuthContext from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useEasterEgg } from '../context/EasterEggContext';
import logo from '../assets/Popov.png';
import ChristmasGarland from './ChristmasGarland';

const NavButton = memo(({ to, icon, text, clickType }) => {
  const location = useLocation();
  const { recordClick } = useEasterEgg();
  
  const isActive = useMemo(() => location.pathname === to, [location.pathname, to]);
  
  const buttonStyles = useMemo(() => ({
    backgroundColor: isActive ? 'success.dark' : 'transparent',
    '&:hover': {
      backgroundColor: isActive ? 'success.main' : 'rgba(255, 255, 255, 0.08)',
    },
    borderRadius: 2,
    mx: 0.5,
    fontSize: { xs: '0.65rem', md: '0.875rem' },
    px: { xs: 1, md: 2 },
    textTransform: 'none',
    minWidth: 'auto',
    whiteSpace: 'nowrap'
  }), [isActive]);

  const handleClick = useCallback(() => {
    if (clickType) {
      recordClick(clickType);
    }
  }, [clickType, recordClick]);

  return (
    <Button 
      color="inherit" 
      component={RouterLink} 
      to={to} 
      startIcon={<span>{icon}</span>}
      onClick={handleClick}
      sx={buttonStyles}
    >
      {text}
    </Button>
  );
});

NavButton.displayName = 'NavButton';

const Navbar = memo(() => {
  const { user, logout } = useContext(AuthContext);
  const { mode, toggleTheme } = useThemeMode();
  const { recordClick, isEasterEggUnlocked } = useEasterEgg();
  const navigate = useNavigate();

  const onLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleLogoClick = useCallback(() => {
    recordClick('logo');
  }, [recordClick]);

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
        { path: '/marche-noel', label: 'Marché de Noël', icon: '🎄' },
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
        mr: 2, 
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

  const renderNavItems = useMemo(() => (
    <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {user ? (
        <>
          {navItems.map((item, index) => (
            <React.Fragment key={item.path}>
              <NavButton 
                to={item.path} 
                icon={item.icon} 
                text={item.label} 
                clickType={item.label.toLowerCase()} 
              />
              <Divider 
                orientation="vertical" 
                flexItem 
                sx={{ 
                  mx: 1, 
                  my: 1.5, 
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  display: index === navItems.length - 1 ? 'none' : 'flex'
                }} 
              />
            </React.Fragment>
          ))}
          {isEasterEggUnlocked && (
            <>
              <Divider 
                orientation="vertical" 
                flexItem 
                sx={{ 
                  mx: 1, 
                  my: 1.5, 
                  borderColor: 'rgba(255, 255, 255, 0.2)' 
                }} 
              />
              <NavButton to="/easter-eggs" icon="🎮" text="Easter-Eggs" />
            </>
          )}
        </>
      ) : null}
    </Box>
  ), [user, navItems, isEasterEggUnlocked]);

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
        <ChristmasGarland />
        {renderLogo}
        <Typography 
          variant="h6" 
          component="div"
          sx={{
            mr: 2,
            fontWeight: 700,
            background: 'linear-gradient(45deg, #fff 30%, #e0e0e0 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: { xs: 'none', sm: 'block' }
          }}
        >
          Delight
        </Typography>

        {renderNavItems}
        
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
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
  );
});

// Configuration de displayName pour le débogage
Navbar.displayName = 'Navbar';

export default Navbar;