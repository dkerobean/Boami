'use client';

import React, { useEffect, useState } from 'react';
import { Box, Backdrop, useTheme, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingAnimation from './LoadingAnimation';
import { LoadingOverlayProps } from './types';
import { LOADING_Z_INDEX, LOADING_OVERLAY_ID, LOADING_ANIMATION_DURATION } from './constants';
import { prefersReducedMotion, logLoadingEvent } from './utils';
import { usePathname } from 'next/navigation';

/**
 * LoadingOverlay component that displays a full-screen overlay during page transitions
 * Features smooth fade in/out animations and responsive design
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = React.memo(({
  isVisible,
  config,
  onAnimationComplete,
}) => {
  const theme = useTheme();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(isVisible);
  const reducedMotion = prefersReducedMotion();

  // Check if we're in dashboard routes
  const isDashboardRoute = pathname.includes('/apps/') || pathname.includes('/dashboard') || pathname.startsWith('/(DashboardLayout)');

  // Handle visibility changes with proper timing
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      logLoadingEvent('Overlay shown');
    } else {
      // Delay unmounting to allow exit animation
      const timeout = setTimeout(() => {
        setShouldRender(false);
        logLoadingEvent('Overlay hidden');
      }, config.fadeOutDuration || LOADING_ANIMATION_DURATION.FADE_OUT);

      return () => clearTimeout(timeout);
    }
  }, [isVisible, config.fadeOutDuration]);

  // Handle accessibility announcements
  useEffect(() => {
    if (isVisible) {
      // Announce loading start to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = 'Page is loading, please wait...';
      document.body.appendChild(announcement);

      // Clean up announcement after a short delay
      const cleanup = setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);

      return () => {
        clearTimeout(cleanup);
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      };
    } else {
      // Announce loading completion
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = 'Page loading completed';
      document.body.appendChild(announcement);

      const cleanup = setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);

      return () => {
        clearTimeout(cleanup);
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      };
    }
  }, [isVisible]);

  // Animation variants for Framer Motion
  const overlayVariants = {
    hidden: {
      opacity: 0,
      backdropFilter: reducedMotion ? 'blur(0px)' : 'blur(0px)',
      transition: {
        duration: reducedMotion ? 0 : (config.fadeOutDuration || LOADING_ANIMATION_DURATION.FADE_OUT) / 1000,
        ease: 'easeOut',
      },
    },
    visible: {
      opacity: 1,
      backdropFilter: reducedMotion ? 'blur(0px)' : 'blur(4px)',
      transition: {
        duration: reducedMotion ? 0 : LOADING_ANIMATION_DURATION.FADE_IN / 1000,
        ease: 'easeIn',
      },
    },
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: reducedMotion ? 0 : 0.2,
        ease: 'easeOut',
      },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: reducedMotion ? 0 : 0.3,
        ease: 'easeOut',
        delay: 0.1,
      },
    },
  };

  // Don't render if not needed
  if (!shouldRender) {
    return null;
  }

  // For dashboard routes with linear animation, render full-width loading bar
  if (isDashboardRoute && config.animationType === 'linear') {
    return (
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          onAnimationComplete?.();
          logLoadingEvent('Dashboard overlay animation completed');
        }}
      >
        {isVisible && (
          <motion.div
            key="dashboard-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : (config.fadeInDuration || LOADING_ANIMATION_DURATION.FADE_IN) / 1000,
              ease: 'easeInOut',
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: LOADING_Z_INDEX,
              pointerEvents: 'none',
            }}
          >
            <LoadingAnimation
              type="linear"
              size="medium"
              color={config.color || 'primary'}
              fullWidth={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        onAnimationComplete?.();
        logLoadingEvent('Overlay animation completed');
      }}
    >
      {isVisible && (
        <motion.div
          key="loading-overlay"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={overlayVariants}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: LOADING_Z_INDEX,
            pointerEvents: 'auto',
          }}
        >
          <Backdrop
            open={true}
            id={LOADING_OVERLAY_ID}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: alpha(
                theme.palette.mode === 'dark'
                  ? theme.palette.grey[900]
                  : theme.palette.common.white,
                0.8
              ),
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)', // Safari support
              zIndex: LOADING_Z_INDEX,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              // Accessibility
              '&:focus': {
                outline: 'none',
              },
            }}
            // Accessibility attributes
            role="dialog"
            aria-modal="true"
            aria-label="Page loading"
            aria-describedby="loading-description"
          >
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(
                    theme.palette.background.paper,
                    0.9
                  ),
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow: theme.shadows[8],
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  minWidth: {
                    xs: 200,
                    sm: 250,
                    md: 300,
                  },
                  maxWidth: {
                    xs: '90vw',
                    sm: '80vw',
                    md: '70vw',
                  },
                  // Responsive design
                  [theme.breakpoints.down('sm')]: {
                    padding: 2,
                    gap: 1.5,
                  },
                }}
              >
                {/* LoadingAnimation component */}
                <Box
                  id="loading-content"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  <LoadingAnimation
                    type={config.animationType || 'circular'}
                    size={config.size || 'medium'}
                    color={config.color || 'primary'}
                    showLogo={config.showLogo || false}
                    showText={config.showText || false}
                    text={config.customText || 'Loading...'}
                  />
                </Box>

                {/* Hidden description for screen readers */}
                <Box
                  id="loading-description"
                  sx={{
                    position: 'absolute',
                    left: -10000,
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                  }}
                >
                  Page is loading, please wait...
                </Box>
              </Box>
            </motion.div>
          </Backdrop>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

export default LoadingOverlay;