"use client";
import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Button,
  LinearProgress,
  Fade,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

interface AuthLoadingProps {
  type: 'login' | 'logout' | 'verification' | 'refresh' | 'security';
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
  showProgress?: boolean;
  variant?: 'circular' | 'linear';
  size?: 'small' | 'medium' | 'large';
}

/**
 * Authentication Loading Component
 * Specialized loading states for authentication processes
 */
export function AuthLoading({
  type,
  message,
  timeout = 30000, // 30 seconds default timeout
  onTimeout,
  showProgress = false,
  variant = 'circular',
  size = 'medium',
}: AuthLoadingProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [progress, setProgress] = useState(0);

  // Handle timeout
  useEffect(() => {
    if (timeout > 0) {
      const timer = setTimeout(() => {
        setHasTimedOut(true);
        onTimeout?.();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [timeout, onTimeout]);

  // Handle progress animation
  useEffect(() => {
    if (showProgress && variant === 'linear') {
      const timer = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + (100 / (timeout / 100));
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 100);

      return () => clearInterval(timer);
    }
  }, [showProgress, variant, timeout]);

  // Get configuration based on type
  const getConfig = () => {
    switch (type) {
      case 'login':
        return {
          icon: <LoginIcon />,
          defaultMessage: 'Signing you in...',
          color: 'primary' as const,
          ariaLabel: 'Signing in, please wait',
        };
      case 'logout':
        return {
          icon: <LogoutIcon />,
          defaultMessage: 'Signing you out...',
          color: 'secondary' as const,
          ariaLabel: 'Signing out, please wait',
        };
      case 'verification':
        return {
          icon: <EmailIcon />,
          defaultMessage: 'Verifying your account...',
          color: 'info' as const,
          ariaLabel: 'Verifying account, please wait',
        };
      case 'refresh':
        return {
          icon: <RefreshIcon />,
          defaultMessage: 'Refreshing session...',
          color: 'primary' as const,
          ariaLabel: 'Refreshing session, please wait',
        };
      case 'security':
        return {
          icon: <SecurityIcon />,
          defaultMessage: 'Performing security check...',
          color: 'warning' as const,
          ariaLabel: 'Performing security check, please wait',
        };
      default:
        return {
          icon: <SecurityIcon />,
          defaultMessage: 'Processing...',
          color: 'primary' as const,
          ariaLabel: 'Processing, please wait',
        };
    }
  };

  const config = getConfig();
  const displayMessage = message || config.defaultMessage;

  // Get size values
  const getSizeValues = () => {
    switch (size) {
      case 'small':
        return { circularSize: 24, iconSize: 20, spacing: 1 };
      case 'large':
        return { circularSize: 60, iconSize: 32, spacing: 3 };
      default:
        return { circularSize: 40, iconSize: 24, spacing: 2 };
    }
  };

  const sizeValues = getSizeValues();

  // Show timeout message
  if (hasTimedOut) {
    return (
      <Fade in={hasTimedOut}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={2}
          p={3}
          role="alert"
          aria-live="polite"
        >
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Taking longer than expected
            </Typography>
            <Typography variant="body2">
              The authentication process is taking longer than usual. Please check your connection and try again.
            </Typography>
          </Alert>
          {onTimeout && (
            <Button variant="outlined" onClick={onTimeout}>
              Retry
            </Button>
          )}
        </Box>
      </Fade>
    );
  }

  return (
    <Fade in={!hasTimedOut}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={sizeValues.spacing}
        p={3}
        role="status"
        aria-live="polite"
        aria-label={config.ariaLabel}
      >
        {/* Icon and Loading Indicator */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
          mb={1}
        >
          {variant === 'circular' ? (
            <>
              <CircularProgress
                size={sizeValues.circularSize}
                color={config.color}
                thickness={4}
              />
              <Box
                position="absolute"
                display="flex"
                alignItems="center"
                justifyContent="center"
                sx={{
                  color: `${config.color}.main`,
                  fontSize: sizeValues.iconSize,
                }}
              >
                {React.cloneElement(config.icon, {
                  fontSize: 'inherit',
                })}
              </Box>
            </>
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              {React.cloneElement(config.icon, {
                color: config.color,
                fontSize: size,
              })}
            </Box>
          )}
        </Box>

        {/* Message */}
        <Typography
          variant={size === 'large' ? 'h6' : 'body1'}
          color="text.secondary"
          textAlign="center"
          sx={{ fontWeight: size === 'large' ? 500 : 400 }}
        >
          {displayMessage}
        </Typography>

        {/* Progress Bar */}
        {showProgress && variant === 'linear' && (
          <Box width="100%" maxWidth={300} mt={1}>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={config.color}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              display="block"
              mt={0.5}
            >
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}

        {/* Accessibility text for screen readers */}
        <Box
          component="span"
          sx={{
            position: 'absolute',
            left: -10000,
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
          aria-live="polite"
        >
          {displayMessage}
        </Box>
      </Box>
    </Fade>
  );
}

/**
 * Preset loading components for common authentication scenarios
 */
export const LoginLoading = (props: Omit<AuthLoadingProps, 'type'>) => (
  <AuthLoading type="login" {...props} />
);

export const LogoutLoading = (props: Omit<AuthLoadingProps, 'type'>) => (
  <AuthLoading type="logout" {...props} />
);

export const VerificationLoading = (props: Omit<AuthLoadingProps, 'type'>) => (
  <AuthLoading type="verification" {...props} />
);

export const RefreshLoading = (props: Omit<AuthLoadingProps, 'type'>) => (
  <AuthLoading type="refresh" {...props} />
);

export const SecurityLoading = (props: Omit<AuthLoadingProps, 'type'>) => (
  <AuthLoading type="security" {...props} />
);

/**
 * Full-screen authentication loading overlay
 */
interface AuthLoadingOverlayProps extends AuthLoadingProps {
  open: boolean;
  backdrop?: boolean;
}

export function AuthLoadingOverlay({
  open,
  backdrop = true,
  ...loadingProps
}: AuthLoadingOverlayProps) {
  if (!open) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
      sx={{
        backgroundColor: backdrop ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
        backdropFilter: backdrop ? 'blur(2px)' : 'none',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication in progress"
    >
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          minWidth: 300,
          maxWidth: 500,
        }}
      >
        <AuthLoading {...loadingProps} size="large" />
      </Box>
    </Box>
  );
}

export default AuthLoading;