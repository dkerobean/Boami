'use client';

import React from 'react';
import { useSubscription } from '../../app/context/SubscriptionContext';
import { UpgradePrompt } from './index';

interface FeatureGateWrapperProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  upgradePromptProps?: any;
  className?: string;
}

const FeatureGateWrapper: React.FC<FeatureGateWrapperProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  upgradePromptProps = {},
  className = ''
}) => {
  const { hasFeatureAccess, loading } = useSubscription();

  // Show loading state
  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-32 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Check if user has access to the feature
  if (hasFeatureAccess(feature)) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt by default
  if (showUpgradePrompt) {
    return (
      <div className={className}>
        <UpgradePrompt
          feature={feature}
          {...upgradePromptProps}
        />
      </div>
    );
  }

  // Return null if no fallback and no upgrade prompt
  return null;
};

export default FeatureGateWrapper;