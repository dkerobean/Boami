'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '../app/context/SubscriptionContext';

export interface UseFeatureAccessReturn {
  hasAccess: (feature: string) => boolean;
  requireAccess: (feature: string, options?: RequireAccessOptions) => boolean;
  checkAndRedirect: (feature: string, redirectTo?: string) => boolean;
  showUpgradePrompt: (feature: string, options?: UpgradePromptOptions) => void;
  isLoading: boolean;
  currentPlan: any;
  isSubscriptionActive: boolean;
}

export interface RequireAccessOptions {
  showAlert?: boolean;
  alertMessage?: string;
  onAccessDenied?: () => void;
}

export interface UpgradePromptOptions {
  title?: string;
  description?: string;
  suggestedPlan?: string;
  onUpgrade?: () => void;
  onClose?: () => void;
}

export const useFeatureAccess = (): UseFeatureAccessReturn => {
  const {
    hasFeatureAccess,
    loading,
    currentPlan,
    isSubscriptionActive
  } = useSubscription();
  const router = useRouter();
  const [upgradePromptState, setUpgradePromptState] = useState<{
    isOpen: boolean;
    feature?: string;
    options?: UpgradePromptOptions;
  }>({ isOpen: false });

  const hasAccess = useCallback((feature: string): boolean => {
    return hasFeatureAccess(feature);
  }, [hasFeatureAccess]);

  const requireAccess = useCallback((
    feature: string,
    options: RequireAccessOptions = {}
  ): boolean => {
    const access = hasFeatureAccess(feature);

    if (!access) {
      if (options.showAlert) {
        const message = options.alertMessage ||
          `This feature requires a premium subscription. Please upgrade to access ${feature}.`;
        alert(message);
      }

      if (options.onAccessDenied) {
        options.onAccessDenied();
      }
    }

    return access;
  }, [hasFeatureAccess]);

  const checkAndRedirect = useCallback((
    feature: string,
    redirectTo?: string
  ): boolean => {
    const access = hasFeatureAccess(feature);

    if (!access) {
      const url = redirectTo || `/subscription/plans?feature=${encodeURIComponent(feature)}`;
      router.push(url);
    }

    return access;
  }, [hasFeatureAccess, router]);

  const showUpgradePrompt = useCallback((
    feature: string,
    options: UpgradePromptOptions = {}
  ) => {
    setUpgradePromptState({
      isOpen: true,
      feature,
      options
    });
  }, []);

  return {
    hasAccess,
    requireAccess,
    checkAndRedirect,
    showUpgradePrompt,
    isLoading: loading,
    currentPlan,
    isSubscriptionActive
  };
};

// Hook for feature-specific access checking
export const useFeature = (feature: string) => {
  const { hasAccess, requireAccess, checkAndRedirect, showUpgradePrompt } = useFeatureAccess();

  return {
    hasAccess: hasAccess(feature),
    requireAccess: (options?: RequireAccessOptions) => requireAccess(feature, options),
    checkAndRedirect: (redirectTo?: string) => checkAndRedirect(feature, redirectTo),
    showUpgradePrompt: (options?: UpgradePromptOptions) => showUpgradePrompt(feature, options)
  };
};

// Common feature constants
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
  UNLIMITED_STORAGE: 'unlimited_storage',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  CUSTOM_FIELDS: 'custom_fields',
  ADVANCED_FILTERS: 'advanced_filters',
  REAL_TIME_SYNC: 'real_time_sync'
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];