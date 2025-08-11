import React, { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Menu,
  Avatar,
  Typography,
  Divider,
  Button,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { IconMail, IconCrown, IconTrendingUp, IconUsers, IconShield } from '@tabler/icons-react';
import { Stack } from '@mui/system';
import Image from 'next/image';
import { useAuthContext } from '@/app/context/AuthContext';
import { useSubscription } from '@/app/context/SubscriptionContext';
import { AuthLoading } from '@/app/components/shared/AuthLoading';
import { usePermission } from '@/lib/hooks/usePermissions';

const profile: any[] = [
  {
    href: "/apps/user-profile/profile",
    title: "My Profile",
    subtitle: "Account Settings",
    icon: "/images/svgs/icon-account.svg",
  },
  {
    href: "/subscription",
    title: "Subscription & Billing",
    subtitle: "Manage your plan",
    icon: "/images/svgs/icon-account.svg", // You can replace with a billing icon
  },
  {
    href: "/apps/email",
    title: "My Inbox",
    subtitle: "Messages & Emails",
    icon: "/images/svgs/icon-inbox.svg",
  },
  {
    href: "/apps/notes",
    title: "My Tasks",
    subtitle: "To-do and Daily Tasks",
    icon: "/images/svgs/icon-tasks.svg",
  },
];


const Profile = () => {
  const [anchorEl2, setAnchorEl2] = useState(null);
  const { user, isLoading, logout, isAuthenticated } = useAuthContext();
  const { subscription, isSubscriptionActive } = useSubscription();

  // Check permissions for user management features
  const canManageUsers = usePermission('users', 'read');
  const canManageRoles = usePermission('roles', 'read');

  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleClose2();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <IconButton color="inherit" disabled>
        <CircularProgress size={24} />
      </IconButton>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Box>
      <IconButton
        aria-label="show 11 new notifications"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === 'object' && {
            color: 'primary.main',
          }),
        }}
        onClick={handleClick2}
      >
        <Avatar
          src={
            (() => {
              const profileImage = user?.profileImage || user?.avatar;
              if (!profileImage) return "/images/profile/user-1.jpg";
              return profileImage;
            })()
          }
          alt={'ProfileImg'}
          sx={{
            width: 35,
            height: 35,
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== "/images/profile/user-1.jpg") {
              target.src = "/images/profile/user-1.jpg";
            }
          }}
        />
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
            p: 4,
          },
        }}
      >
        <Typography variant="h5">User Profile</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
        <Avatar
          src={
            (() => {
              const profileImage = user?.profileImage || user?.avatar;
              if (!profileImage) return "/images/profile/user-1.jpg";
              return profileImage;
            })()
          }
          alt={"ProfileImg"}
          sx={{ width: 95, height: 95 }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== "/images/profile/user-1.jpg") {
              target.src = "/images/profile/user-1.jpg";
            }
          }}
        />
          <Box>
            <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Mathew Anderson'}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {user?.designation || 'Designer'}
            </Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <IconMail width={15} height={15} />
              {user?.email || 'info@BOAMI.com'}
            </Typography>
          </Box>
        </Stack>
        <Divider />
        {profile.map((profile) => (
          <Box key={profile.title}>
            <Box sx={{ py: 2, px: 0 }} className="hover-text-primary">
              <Link href={profile.href}>
                <Stack direction="row" spacing={2}>
                  <Box
                    width="45px"
                    height="45px"
                    bgcolor="primary.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center" flexShrink="0"
                  >
                    <Avatar
                      src={profile.icon}
                      alt={profile.icon}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="textPrimary"
                      className="text-hover"
                      noWrap
                      sx={{
                        width: '240px',
                      }}
                    >
                      {profile.title}
                    </Typography>
                    <Typography
                      color="textSecondary"
                      variant="subtitle2"
                      sx={{
                        width: '240px',
                      }}
                      noWrap
                    >
                      {profile.subtitle}
                    </Typography>
                  </Box>
                </Stack>
              </Link>
            </Box>
          </Box>
        ))}

        {/* User Management Section */}
        {(canManageUsers || canManageRoles) && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="textSecondary" sx={{ px: 0, py: 1, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Administration
            </Typography>

            {canManageUsers && (
              <Box sx={{ py: 2, px: 0 }} className="hover-text-primary">
                <Link href="/admin/user-management">
                  <Stack direction="row" spacing={2}>
                    <Box
                      width="45px"
                      height="45px"
                      bgcolor="primary.light"
                      display="flex"
                      alignItems="center"
                      justifyContent="center" flexShrink="0"
                    >
                      <IconUsers size={24} />
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        color="textPrimary"
                        className="text-hover"
                        noWrap
                        sx={{
                          width: '240px',
                        }}
                      >
                        Manage Users
                      </Typography>
                      <Typography
                        color="textSecondary"
                        variant="subtitle2"
                        sx={{
                          width: '240px',
                        }}
                        noWrap
                      >
                        Invite and manage team members
                      </Typography>
                    </Box>
                  </Stack>
                </Link>
              </Box>
            )}

            {canManageRoles && (
              <Box sx={{ py: 2, px: 0 }} className="hover-text-primary">
                <Link href="/admin/role-management">
                  <Stack direction="row" spacing={2}>
                    <Box
                      width="45px"
                      height="45px"
                      bgcolor="primary.light"
                      display="flex"
                      alignItems="center"
                      justifyContent="center" flexShrink="0"
                    >
                      <IconShield size={24} />
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        color="textPrimary"
                        className="text-hover"
                        noWrap
                        sx={{
                          width: '240px',
                        }}
                      >
                        Manage Roles
                      </Typography>
                      <Typography
                        color="textSecondary"
                        variant="subtitle2"
                        sx={{
                          width: '240px',
                        }}
                        noWrap
                      >
                        Configure roles and permissions
                      </Typography>
                    </Box>
                  </Stack>
                </Link>
              </Box>
            )}
          </>
        )}
        <Box mt={2}>
          {/* Dynamic Subscription Section */}
          {isSubscriptionActive && subscription ? (
            // Active subscription - show current plan
            <Box bgcolor="success.light" p={3} mb={3} overflow="hidden" position="relative">
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <IconCrown size={20} color="#f59e0b" />
                    <Typography variant="h6" fontWeight={600}>
                      {subscription.plan?.name || 'Pro Plan'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {subscription.status === 'active' ? 'Active' : subscription.status}
                  </Typography>
                  <Link href="/subscription" style={{ textDecoration: 'none' }}>
                    <Button variant="contained" size="small" startIcon={<IconTrendingUp />}>
                      Manage Plan
                    </Button>
                  </Link>
                </Box>
                <Image
                  src={"/images/backgrounds/unlimited-bg.png"}
                  width={120}
                  height={140}
                  style={{ height: 'auto', width: 'auto' }}
                  alt="subscription"
                  className="signup-bg"
                />
              </Box>
            </Box>
          ) : (
            // No active subscription - show upgrade prompt
            <Box bgcolor="primary.light" p={3} mb={3} overflow="hidden" position="relative">
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography variant="h5" mb={1}>
                    Unlock <br />
                    Premium Features
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Get unlimited access to all features
                  </Typography>
                  <Link href="/subscription" style={{ textDecoration: 'none' }}>
                    <Button variant="contained" color="primary" startIcon={<IconTrendingUp />}>
                      Upgrade Now
                    </Button>
                  </Link>
                </Box>
                <Image
                  src={"/images/backgrounds/unlimited-bg.png"}
                  width={150}
                  height={183}
                  style={{ height: 'auto', width: 'auto' }}
                  alt="unlimited"
                  className="signup-bg"
                />
              </Box>
            </Box>
          )}

          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
