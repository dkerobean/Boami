'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLoadingContext } from '@/app/components/shared/loading/LoadingContext';

/**
 * Custom hook for dashboard navigation loading
 * Handles loading states for sub-menu navigation within the dashboard
 */
export const useDashboardLoading = () => {
  const { setLoading, updateConfig } = useLoadingContext();
  const pathname = usePathname();
  const previousPathnameRef = useRef<string>(pathname);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configure dashboard-specific loading (linear animation covering full screen)
  useEffect(() => {
    // Check if we're in dashboard routes
    const isDashboardRoute = pathname.startsWith('/(dashboard)') ||
                            pathname.includes('/apps/') ||
                            pathname.includes('/dashboard');

    if (isDashboardRoute) {
      updateConfig({
        animationType: 'linear',
        minDisplayTime: 150,
        maxDisplayTime: 3000,
        showText: false,
        showLogo: false,
      });
    }
  }, [pathname, updateConfig]);

  // Handle sub-menu navigation within dashboard
  useEffect(() => {
    const currentPathname = pathname;
    const previousPathname = previousPathnameRef.current;

    // Check if this is a dashboard sub-navigation
    const isDashboardNavigation =
      currentPathname !== previousPathname &&
      (currentPathname.includes('/apps/') || currentPathname.includes('/dashboard')) &&
      (previousPathname.includes('/apps/') || previousPathname.includes('/dashboard'));

    if (isDashboardNavigation) {
      // Start loading for dashboard navigation
      setLoading(true);

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Stop loading after a short delay to allow page to render
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 200);
    }

    previousPathnameRef.current = currentPathname;
  }, [pathname, setLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isDashboardRoute: pathname.includes('/apps/') || pathname.includes('/dashboard'),
  };
};

export default useDashboardLoading;