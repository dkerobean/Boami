'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingContextProvider, useLoadingContext } from './LoadingContext';
import LoadingOverlay from './LoadingOverlay';
import { LoadingErrorHandler } from './ErrorHandler';
import { LoadingProviderProps } from './types';
import {
  hasMinimumTimeElapsed,
  hasMaximumTimeExceeded,
  logLoadingEvent,
  debounce,
  validateLoadingConfig
} from './utils';

/**
 * Internal component that handles router events and loading state
 * This component must be inside the LoadingContextProvider to access the context
 */
const LoadingManager: React.FC = () => {
  const { isLoading, setLoading, config, loadingState } = useLoadingContext();
  const pathname = usePathname();
  const router = useRouter();
  const errorHandler = LoadingErrorHandler.getInstance();

  // Refs for tracking state and timers
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathnameRef = useRef<string>(pathname);
  const isNavigatingRef = useRef<boolean>(false);

  /**
   * Start loading with minimum display time logic
   */
  const startLoading = useCallback(() => {
    if (isNavigatingRef.current) return; // Prevent duplicate loading states

    isNavigatingRef.current = true;
    logLoadingEvent('Navigation started', { from: previousPathnameRef.current, to: 'pending' });

    setLoading(true);

    // Set maximum timeout to prevent infinite loading
    if (config.maxDisplayTime) {
      loadingTimeoutRef.current = setTimeout(() => {
        logLoadingEvent('Loading timeout exceeded', { maxTime: config.maxDisplayTime });
        stopLoading();
      }, config.maxDisplayTime);
    }
  }, [setLoading, config.maxDisplayTime]);

  /**
   * Stop loading with minimum display time enforcement
   */
  const stopLoading = useCallback(() => {
    const startTime = loadingState.startTime;
    const minTime = config.minDisplayTime || 200;

    if (startTime && !hasMinimumTimeElapsed(startTime, minTime)) {
      // Wait for minimum display time before hiding
      const remainingTime = minTime - (Date.now() - startTime);

      minDisplayTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        isNavigatingRef.current = false;
        logLoadingEvent('Navigation completed (after min time)', {
          totalTime: Date.now() - startTime
        });
      }, remainingTime);
    } else {
      // Hide immediately
      setLoading(false);
      isNavigatingRef.current = false;
      logLoadingEvent('Navigation completed', {
        totalTime: startTime ? Date.now() - startTime : 0
      });
    }

    // Clear maximum timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, [setLoading, config.minDisplayTime, loadingState.startTime]);

  /**
   * Debounced loading functions to prevent rapid state changes
   */
  const debouncedStartLoading = useCallback(
    debounce(startLoading, 50),
    [startLoading]
  );

  const debouncedStopLoading = useCallback(
    debounce(stopLoading, 50),
    [stopLoading]
  );

  /**
   * Handle pathname changes (Next.js App Router navigation)
   */
  useEffect(() => {
    const currentPathname = pathname;
    const previousPathname = previousPathnameRef.current;

    if (currentPathname !== previousPathname) {
      logLoadingEvent('Pathname changed', {
        from: previousPathname,
        to: currentPathname
      });

      // Check if this is dashboard navigation
      const isDashboardNavigation =
        (currentPathname.includes('/apps/') || currentPathname.includes('/dashboard')) &&
        (previousPathname.includes('/apps/') || previousPathname.includes('/dashboard'));

      // Start loading for new navigation
      if (!isLoading && !isNavigatingRef.current) {
        debouncedStartLoading();
      }

      // Update previous pathname
      previousPathnameRef.current = currentPathname;

      // Stop loading after a shorter delay for dashboard navigation
      const delay = isDashboardNavigation ? 150 : 300;
      setTimeout(() => {
        if (isNavigatingRef.current) {
          debouncedStopLoading();
        }
      }, delay);
    }
  }, [pathname, isLoading, debouncedStartLoading, debouncedStopLoading]);

  /**
   * Handle browser navigation events (back/forward buttons)
   */
  useEffect(() => {
    const handlePopState = () => {
      logLoadingEvent('Browser navigation detected');
      if (!isNavigatingRef.current) {
        startLoading();
      }
    };

    const handleBeforeUnload = () => {
      logLoadingEvent('Page unload detected');
      startLoading();
    };

    // Listen for browser navigation
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [startLoading]);

  /**
   * Handle maximum loading timeout
   */
  useEffect(() => {
    if (isLoading && loadingState.startTime) {
      const checkTimeout = () => {
        if (hasMaximumTimeExceeded(loadingState.startTime, config.maxDisplayTime || 5000)) {
          logLoadingEvent('Maximum loading time exceeded, forcing stop');
          stopLoading();
        }
      };

      const timeoutCheck = setTimeout(checkTimeout, config.maxDisplayTime || 5000);
      return () => clearTimeout(timeoutCheck);
    }
  }, [isLoading, loadingState.startTime, config.maxDisplayTime, stopLoading]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (minDisplayTimeoutRef.current) {
        clearTimeout(minDisplayTimeoutRef.current);
      }
    };
  }, []);

  return null; // This component only manages side effects
};

/**
 * Internal component that renders the loading overlay
 * This component must be inside the LoadingContextProvider to access the context
 */
const LoadingOverlayRenderer: React.FC = () => {
  const { isLoading, config } = useLoadingContext();

  return (
    <LoadingOverlay
      isVisible={isLoading}
      config={config}
      onAnimationComplete={() => {
        logLoadingEvent('Overlay animation completed');
      }}
    />
  );
};

/**
 * LoadingProvider component that wraps the entire application
 * Provides loading state management and handles Next.js navigation events
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
  config = {}
}) => {
  // Validate configuration
  useEffect(() => {
    if (!validateLoadingConfig(config)) {
      console.warn('[LoadingProvider] Invalid configuration provided, using defaults');
    }
  }, [config]);

  return (
    <LoadingContextProvider config={config}>
      <LoadingManager />
      <LoadingOverlayRenderer />
      {children}
    </LoadingContextProvider>
  );
};

export default LoadingProvider;