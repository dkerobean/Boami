'use client';

import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import { LoadingAnimationProps } from './types';
import { prefersReducedMotion, getAnimationDuration } from './utils';

/**
 * Circular loading animation using Material-UI CircularProgress
 */
const CircularAnimation: React.FC<Pick<LoadingAnimationProps, 'size' | 'color'>> = ({
  size = 'medium',
  color = 'primary'
}) => {
  const sizeMap = {
    small: 32,
    medium: 48,
    large: 64,
  };

  return (
    <CircularProgress
      size={sizeMap[size]}
      color={color}
      thickness={4}
      sx={{
        animationDuration: '1s',
      }}
    />
  );
};

/**
 * Linear loading animation using Material-UI LinearProgress
 */
const LinearAnimation: React.FC<Pick<LoadingAnimationProps, 'size' | 'color' | 'fullWidth'>> = ({
  size = 'medium',
  color = 'primary',
  fullWidth = false
}) => {
  const widthMap = {
    small: 120,
    medium: 200,
    large: 280,
  };

  return (
    <Box sx={{
      width: fullWidth ? '100vw' : widthMap[size],
      position: fullWidth ? 'fixed' : 'relative',
      top: fullWidth ? 0 : 'auto',
      left: fullWidth ? 0 : 'auto',
      zIndex: fullWidth ? 9999 : 'auto'
    }}>
      <LinearProgress
        color={color}
        sx={{
          height: fullWidth ? 4 : (size === 'small' ? 3 : size === 'medium' ? 4 : 6),
          borderRadius: fullWidth ? 0 : 2,
          animationDuration: '2s',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-in-out',
          }
        }}
      />
    </Box>
  );
};

/**
 * Custom dots bouncing animation
 */
const DotsAnimation: React.FC<Pick<LoadingAnimationProps, 'size' | 'color'>> = ({
  size = 'medium',
  color = 'primary'
}) => {
  const theme = useTheme();
  const reducedMotion = prefersReducedMotion();

  const sizeMap = {
    small: 6,
    medium: 8,
    large: 12,
  };

  const dotSize = sizeMap[size];
  const dotColor = color === 'primary'
    ? theme.palette.primary.main
    : color === 'secondary'
    ? theme.palette.secondary.main
    : theme.palette.text.primary;

  const bounceVariants = {
    animate: {
      y: [0, -dotSize * 2, 0],
      transition: {
        duration: reducedMotion ? 0 : 0.6,
        repeat: reducedMotion ? 0 : Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size === 'small' ? 0.5 : size === 'medium' ? 1 : 1.5,
      }}
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={bounceVariants}
          animate="animate"
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: dotColor,
            animationDelay: `${index * 0.1}s`,
          }}
          transition={{
            delay: index * 0.1,
          }}
        />
      ))}
    </Box>
  );
};

/**
 * Pulsing logo/icon animation
 */
const PulseAnimation: React.FC<Pick<LoadingAnimationProps, 'size' | 'color'>> = ({
  size = 'medium',
  color = 'primary'
}) => {
  const theme = useTheme();
  const reducedMotion = prefersReducedMotion();

  const sizeMap = {
    small: 32,
    medium: 48,
    large: 64,
  };

  const pulseSize = sizeMap[size];
  const pulseColor = color === 'primary'
    ? theme.palette.primary.main
    : color === 'secondary'
    ? theme.palette.secondary.main
    : theme.palette.text.primary;

  const pulseVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: reducedMotion ? 0 : 1,
        repeat: reducedMotion ? 0 : Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.div
      variants={pulseVariants}
      animate="animate"
      style={{
        width: pulseSize,
        height: pulseSize,
        borderRadius: '50%',
        backgroundColor: alpha(pulseColor, 0.2),
        border: `2px solid ${pulseColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: pulseSize * 0.6,
          height: pulseSize * 0.6,
          borderRadius: '50%',
          backgroundColor: pulseColor,
        }}
      />
    </motion.div>
  );
};

/**
 * LoadingAnimation component with multiple animation types
 * Supports circular, linear, dots, and pulse animations
 */
export const LoadingAnimation: React.FC<LoadingAnimationProps> = React.memo(({
  type,
  size = 'medium',
  color = 'primary',
  showLogo = false,
  showText = false,
  text = 'Loading...',
  fullWidth = false,
}) => {
  const theme = useTheme();

  const renderAnimation = () => {
    switch (type) {
      case 'circular':
        return <CircularAnimation size={size} color={color} />;
      case 'linear':
        return <LinearAnimation size={size} color={color} fullWidth={fullWidth} />;
      case 'dots':
        return <DotsAnimation size={size} color={color} />;
      case 'pulse':
        return <PulseAnimation size={size} color={color} />;
      default:
        return <CircularAnimation size={size} color={color} />;
    }
  };

  // For full-width linear animations, render differently
  if (type === 'linear' && fullWidth) {
    return renderAnimation();
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 2,
      }}
    >
      {/* Logo section - placeholder for future logo integration */}
      {showLogo && (
        <Box
          sx={{
            width: size === 'small' ? 32 : size === 'medium' ? 48 : 64,
            height: size === 'small' ? 32 : size === 'medium' ? 48 : 64,
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 1,
          }}
        >
          {/* Placeholder for logo - can be replaced with actual logo component */}
          <Typography
            variant={size === 'small' ? 'caption' : size === 'medium' ? 'body2' : 'body1'}
            color="primary"
            fontWeight="bold"
          >
            LOGO
          </Typography>
        </Box>
      )}

      {/* Main animation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {renderAnimation()}
      </Box>

      {/* Loading text */}
      {showText && (
        <Typography
          variant={size === 'small' ? 'caption' : size === 'medium' ? 'body2' : 'body1'}
          color="textSecondary"
          sx={{
            marginTop: 1,
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          {text}
        </Typography>
      )}
    </Box>
  );
});

LoadingAnimation.displayName = 'LoadingAnimation';

export default LoadingAnimation;