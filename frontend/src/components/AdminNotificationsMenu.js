import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import socket from '../services/socket';

const formatDate = (dateValue) => {
  if (!dateValue) return '';
  try {
    return new Date(dateValue).toLocaleString('fr-FR');
  } catch {
    return '';
  }
};

export default function AdminNotificationsMenu() {
  const { user } = useContext(AuthContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (e) {
      // volontairement silencieux (la Navbar ne doit pas casser l'app)
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!user) return undefined;
    const handleDataUpdate = (payload) => {
      if (payload?.type === 'NOTIFICATIONS_UPDATED') {
        fetchNotifications();
      }
    };
    socket.on('data-updated', handleDataUpdate);
    return () => socket.off('data-updated', handleDataUpdate);
  }, [user, fetchNotifications]);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      // silencieux
    }
  }, []);

  const badgeContent = useMemo(() => {
    if (!user) return 0;
    return unreadCount > 99 ? '99+' : unreadCount;
  }, [user, unreadCount]);

  if (!user) return null;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label="notifications"
          aria-controls={open ? 'notifications-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          sx={{ ml: 1 }}
        >
          <Badge
            badgeContent={badgeContent}
            color="error"
            invisible={!unreadCount}
            overlap="circular"
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxWidth: '90vw',
            // Fond opaque pour éviter la transparence (lisibilité)
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(14px)',
            border: (theme) =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(148, 163, 184, 0.18)'
                : '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 12px 32px rgba(0,0,0,0.45)'
                : '0 12px 32px rgba(2,6,23,0.18)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {unreadCount ? `${unreadCount} non lue(s)` : 'Tout est lu'}
            </Typography>
          </Box>

          {unreadCount ? (
            <Button size="small" onClick={handleMarkAllRead} sx={{ whiteSpace: 'nowrap' }}>
              Marquer comme lu
            </Button>
          ) : null}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={22} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Aucune notification.
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifications.map((n) => (
              <Box key={n._id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    py: 1.25,
                    backgroundColor: n.isRead ? 'transparent' : 'rgba(244, 67, 54, 0.06)',
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: n.isRead ? 600 : 800 }}>
                        {n.title?.trim() ? n.title : 'Information'}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {n.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(n.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </Box>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}

