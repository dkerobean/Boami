import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Box,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import * as dropdownData from './data';
import Scrollbar from '@/app/components/custom-scroll/Scrollbar';

import { IconBellRinging } from '@tabler/icons-react';
import { Stack } from '@mui/system';
import Link from 'next/link';

interface NotificationData {
  avatar: string;
  title: string;
  subtitle: string;
}

const Notifications = () => {
  const [anchorEl2, setAnchorEl2] = useState(null);
  const [notifications, setNotifications] = useState<NotificationData[]>(dropdownData.notifications);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
    // Fetch fresh notifications when dropdown opens
    fetchRealNotifications();
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const fetchRealNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/real?format=header&limit=8');

      if (response.ok) {
        const realNotifications = await response.json();
        setNotifications(realNotifications);

        // Get unread count
        const countResponse = await fetch('/api/notifications/real?limit=50');
        if (countResponse.ok) {
          const countData = await countResponse.json();
          setUnreadCount(countData.unreadCount || 0);
        }
      } else {
        console.warn('Failed to fetch real notifications, using fallback');
        setNotifications(dropdownData.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications(dropdownData.notifications);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on component mount
  useEffect(() => {
    fetchRealNotifications();

    // Set up periodic refresh (every 30 seconds)
    const interval = setInterval(fetchRealNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="show 11 new notifications"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          color: anchorEl2 ? 'primary.main' : 'text.secondary',
        }}
        onClick={handleClick2}
      >
        <Badge
          badgeContent={unreadCount > 0 ? unreadCount : undefined}
          color="primary"
          variant={unreadCount > 0 ? 'standard' : 'dot'}
        >
          <IconBellRinging size="21" stroke="1.5" />
        </Badge>
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{
          '& .MuiMenu-paper': {
            width: '360px',
          },
        }}
      >
        <Stack direction="row" py={2} px={4} justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} new`} color="primary" size="small" />
          )}
          {loading && <CircularProgress size={16} />}
        </Stack>
        <Scrollbar sx={{ height: '385px' }}>
          {notifications.map((notification, index) => (
            <Box key={index}>
              <MenuItem sx={{ py: 2, px: 4 }}>
                <Stack direction="row" spacing={2}>
                  <Avatar
                    src={notification.avatar}
                    alt={notification.avatar}
                    sx={{
                      width: 48,
                      height: 48,
                    }}
                  />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="textPrimary"
                      fontWeight={600}
                      noWrap
                      sx={{
                        width: '240px',
                      }}
                    >
                      {notification.title}
                    </Typography>
                    <Typography
                      color="textSecondary"
                      variant="subtitle2"
                      sx={{
                        width: '240px',
                      }}
                      noWrap
                    >
                      {notification.subtitle}
                    </Typography>
                  </Box>
                </Stack>
              </MenuItem>
            </Box>
          ))}
        </Scrollbar>
        <Box p={3} pb={1}>
          <Button href="/apps/email" variant="outlined" component={Link} color="primary" fullWidth>
            See all Notifications
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Notifications;
