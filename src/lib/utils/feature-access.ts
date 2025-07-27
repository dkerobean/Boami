import { useSubscription } from '../../app/context/SubscriptionContext';

// Feature access utility functions
export interface FeatureGateConfig {
  feature: string;
  fallback?: () => void;
  redirectTo?: string;
  showUpgradePrompt?: boolean;
}

// Hook for checking feature access
export const useFeatureAccess = () => {
  const { hasFeatureAccess, isSubscriptionActive, currentPlan } = useSubscription();

  const checkAccess = (feature: string): boolean => {
    return hasFeatureAccess(feature);
  };

  const requireFeature = (feature: string): boolean => {
    const hasAccess = hasFeatureAccess(feature);
    if (!hasAccess) {
      console.warn(`Feature access denied: ${feature}. Current plan: ${currentPlan?.name || 'None'}`);
    }
    return hasAccess;
  };

  return {
    checkAccess,
    requireFeature,
    isSubscriptionActive,
    currentPlan
  };
};

// Server-side feature access check
export const checkServerFeatureAccess = async (userId: string, feature: string): Promise<boolean> => {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/subscriptions/feature-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, feature }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success && data.hasAccess;
  } catch (error) {
    console.error('Error checking server feature access:', error);
    return false;
  }
};

// Feature gate component
import React from 'react';
import { UpgradePrompt } from '../../components/subscription';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  upgradePromptProps?: any;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  upgradePromptProps = {}
}) => {
  const { hasFeatureAccess } = useSubscription();

  if (hasFeatureAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <UpgradePrompt
        feature={feature}
        {...upgradePromptProps}
      />
    );
  }

  return null;
};

// Higher-order component for feature gating
export const withFeatureAccess = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  options: {
    fallback?: React.ComponentType<P>;
    showUpgradePrompt?: boolean;
    upgradePromptProps?: any;
  } = {}
) => {
  const FeatureGatedComponent: React.FC<P> = (props) => {
    const { hasFeatureAccess } = useSubscription();

    if (hasFeatureAccess(feature)) {
      return <WrappedComponent {...props} />;
    }

    if (options.fallback) {
      const FallbackComponent = options.fallback;
      return <FallbackComponent {...props} />;
    }

    if (options.showUpgradePrompt !== false) {
      return (
        <UpgradePrompt
          feature={feature}
          {...(options.upgradePromptProps || {})}
        />
      );
    }

    return null;
  };

  FeatureGatedComponent.displayName = `withFeatureAccess(${WrappedComponent.displayName || WrappedComponent.name})`;

  return FeatureGatedComponent;
};

// Feature access constants
export const FEATURES = {
  ADVANCED_ANALYTICS: 'advanced_analytics',
  BULK_OPERATIONS: 'bulk_operations',
  API_ACCESS: 'api_access',
  PRIORITY_SUPPORT: 'priority_support',
  CUSTOM_BRANDING: 'custom_branding',
  ADVANCED_REPORTING: 'advanced_reporting',
  TEAM_COLLABORATION: 'team_collaboration',
  AUTOMATED_WORKFLOWS: 'automated_workflows',
  INTEGRATIONS: 'integrations',
  UNLIMITED_STORAGE: 'unlimited_storage'
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];