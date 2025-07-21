import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery, CircularProgress } from '@mui/material';
import { useSelector } from '@/store/hooks';
import { IconPower } from '@tabler/icons-react';
import { AppState } from '@/store/store';
import { useAuthContext } from '@/app/context/AuthContext';

export const Profile = () => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';
  const { user, isLoading, logout, isAuthenticated } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <Box
        display={'flex'}
        alignItems="center"
        justifyContent="center"
        sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar
            alt="User Profile"
            src={user?.profileImage || user?.avatar || "/images/profile/user-1.jpg"}
            sx={{height: 40, width: 40}}
          />

          <Box>
            <Typography variant="h6">
              {user?.firstName || 'Mathew'}
            </Typography>
            <Typography variant="caption">
              {user?.designation || 'Designer'}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Logout" placement="top">
              <IconButton
                color="primary"
                onClick={handleLogout}
                aria-label="logout"
                size="small"
              >
                <IconPower size="20" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
