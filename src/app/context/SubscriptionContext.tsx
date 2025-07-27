'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';

interface SubscriptionContextType {
  subscription: any | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  hasFeatureAccess: (feature: string) => boolean;
  isSubscriptionActive: boolean;
  currentPlan: any | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuthContext();

  const fetchSubscription = async () => {
    if (!user?._id || !isAuthenticated) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/subscriptions/current?userId=${user._id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();

      if (data.success) {
        setSubscription(data.data);
      } else {
        setSubscription(null);
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  const hasFeatureAccess = (feature: string): boolean => {
    if (!subscription || !subscription.isActive) {
      return false;
    }

    const plan = subscription.plan;
    if (!plan || !plan.features) {
      return false;
    }

    const featureConfig = plan.features[feature];
    return featureConfig && featureConfig.enabled;
  };

  const isSubscriptionActive = subscription && subscription.isActive;
  const currentPlan = subscription?.plan || null;

  useEffect(() => {
    fetchSubscription();
  }, [user?._id, isAuthenticated]);

  const contextValue: SubscriptionContextType = {
    subscription,
    loading,
    error,
    refreshSubscription,
    hasFeatureAccess,
    isSubscriptionActive,
    currentPlan
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};