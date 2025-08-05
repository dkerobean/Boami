'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, LinearProgress, useTheme, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Navigation Loading Indicator compatible with Next.js 14.2.7
 * Shows a smooth loading bar during page transitions by monitoring pathname changes
 */
export const NavigationLoadingIndicator: React.FC = () => {
  const pathname = usePathname();
  const theme = useTheme();
  const [isNavigating, setIsNavigating] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);

  // Monitor pathname changes to detect navigation
  useEffect(() => {
    if (pathname !== previousPath) {
      // Navigation started
      setIsNavigating(true);
      
      // Hide loading after a short delay to allow page to settle
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 300);

      // Update previous path
      setPreviousPath(pathname);

      return () => clearTimeout(timer);
    }
  }, [pathname, previousPath]);

  // Also monitor route change events
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsNavigating(true);
    };

    const handleRouteChangeComplete = () => {
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 150);
      return () => clearTimeout(timer);
    };

    // Listen for browser navigation events
    const handlePopState = () => {
      setIsNavigating(true);
      setTimeout(() => setIsNavigating(false), 300);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            transformOrigin: 'left center',
          }}
        >
          <Box
            sx={{
              height: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              overflow: 'hidden',
            }}
          >
            <LinearProgress
              color="primary"
              sx={{
                height: '100%',
                backgroundColor: 'transparent',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.primary.main,
                  animation: 'loadingProgress 1.5s ease-in-out infinite',
                },
                '@keyframes loadingProgress': {
                  '0%': {
                    transform: 'translateX(-100%)',
                  },
                  '50%': {
                    transform: 'translateX(0%)',
                  },
                  '100%': {
                    transform: 'translateX(100%)',
                  },
                },
              }}
            />
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NavigationLoadingIndicator;