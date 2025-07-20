'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLoadingContext } from '@/app/components/shared/loading/LoadingContext';

interface NavigationWrapperProps {
  children: React.ReactNode;
  href: string;
  onClick?: () => void;
}

/**
 * Navigation wrapper component that handles loading states for dashboard navigation
 * This component wraps navigation links to trigger loading animations on route changes
 */
export const NavigationWrapper: React.FC<NavigationWrapperProps> = ({
  children,
  href,
  onClick,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { setLoading } = useLoadingContext();

  const handleNavigation = (e: React.MouseEvent) => {
    e.preventDefault();

    // Only trigger loading if navigating to a different route
    if (href !== pathname) {
      // Start loading animation
      setLoading(true);

      // Navigate to the new route
      router.push(href);
    }

    // Call original onClick if provided
    if (onClick) {
      onClick();
    }
  };

  return (
    <div onClick={handleNavigation} style={{ cursor: 'pointer', width: '100%' }}>
      {children}
    </div>
  );
};

export default NavigationWrapper;