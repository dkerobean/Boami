'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '../../app/context/SubscriptionContext';

interface SubscriptionIndicatorProps {
  showUpgradeButton?: boolean;
  compact?: boolean;
  className?: string;
}

const SubscriptionIndicator: React.FC<SubscriptionIndicatorProps> = ({
  showUpgradeButton = true,
  compact = false,
  className = ''
}) => {
  const { subscription, isSubscriptionActive, currentPlan, loading } = useSubscription();
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/subscription/plans');
  };

  const handleManage = () => {
    router.push('/subscription/manage');
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-8 w-32 ${className}`}></div>
    );
  }

  if (!subscription || !isSubscriptionActive) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Free Plan
        </span>
        {showUpgradeButton && !compact && (
          <button
            onClick={handleUpgrade}
            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Upgrade
          </button>
        )}
      </div>
    );
  }

  const getStatusColor = () => {
    if (!subscription.isActive) return 'bg-red-100 text-red-800';
    if (subscription.cancelAtPeriodEnd) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = () => {
    if (!subscription.isActive) return 'Expired';
    if (subscription.cancelAtPeriodEnd) return 'Cancelling';
    return currentPlan?.name || 'Active';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>

      {subscription.isActive && (
        <button
          onClick={handleManage}
          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Manage
        </button>
      )}

      {showUpgradeButton && subscription.isActive && !subscription.cancelAtPeriodEnd && (
        <button
          onClick={handleUpgrade}
          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Upgrade
        </button>
      )}
    </div>
  );
};

export default SubscriptionIndicator;