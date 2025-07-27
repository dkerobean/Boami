'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

interface UpgradePromptProps {
  feature?: string;
  title?: string;
  description?: string;
  suggestedPlan?: string;
  onUpgrade?: () => void;
  onClose?: () => void;
  isOpen?: boolean;
  className?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  title,
  description,
  suggestedPlan,
  onUpgrade,
  onClose,
  isOpen = true,
  className = ''
}) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recommendedPlan, setRecommendedPlan] = useState<any>(null);

  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/subscriptions/plans');

        if (!response.ok) {
          throw new Error('Failed to fetch subscription plans');
        }

        const data = await response.json();

        if (data.success && data.data) {
          setPlans(data.data);

          // Find recommended plan
          if (suggestedPlan) {
            const recommended = data.data.find((plan: any) => plan.name === suggestedPlan);
            if (recommended) {
              setRecommendedPlan(recommended);
            } else {
              // Default to the middle plan if suggested plan not found
              const sortedPlans = [...data.data].sort((a, b) => a.sortOrder - b.sortOrder);
              setRecommendedPlan(sortedPlans[Math.min(1, sortedPlans.length - 1)]);
            }
          } else {
            // Default to the middle plan
            const sortedPlans = [...data.data].sort((a, b) => a.sortOrder - b.sortOrder);
            setRecommendedPlan(sortedPlans[Math.min(1, sortedPlans.length - 1)]);
          }
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen, suggestedPlan]);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else if (recommendedPlan) {
      router.push(`/subscription/checkout?planId=${recommendedPlan.id}&billingPeriod=monthly`);
    } else {
      router.push('/subscription/plans');
    }
  };

  const handleViewAllPlans = () => {
    router.push('/subscription/plans');
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const defaultTitle = feature
    ? `Upgrade to Access ${feature}`
    : 'Upgrade Your Subscription';

  const defaultDescription = feature
    ? `This feature requires a premium subscription. Upgrade now to unlock ${feature} and many other premium features.`
    : 'Upgrade your subscription to access premium features and take your experience to the next level.';

  return (
    <div className={`bg-white rounded-lg shadow-xl overflow-hidden ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {title || defaultTitle}
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>{description || defaultDescription}</p>
            </div>
          </div>
          {onClose && (
            <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="mt-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded w-full"></div>
            <div className="mt-4 h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ) : recommendedPlan ? (
          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-medium text-gray-900">{recommendedPlan.name} Plan</h4>
                <p className="text-sm text-gray-500">{recommendedPlan.description}</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('en-NG', {
                      style: 'currency',
                      currency: recommendedPlan.price.currency || 'NGN',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(recommendedPlan.price.monthly)}
                  </span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={handleUpgrade}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Upgrade Now
                </button>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">What you'll get:</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                {Object.entries(recommendedPlan.features || {})
                  .filter(([_, feature]: [string, any]) => feature.enabled)
                  .slice(0, 3)
                  .map(([key, feature]: [string, any], index) => (
                    <li key={index} className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature.description}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleUpgrade}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {recommendedPlan ? `Upgrade to ${recommendedPlan.name}` : 'Upgrade Now'}
          </button>
          <button
            type="button"
            onClick={handleViewAllPlans}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            View All Plans
          </button>
        </div>

        {!isAuthenticated && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Don't have an account? <a href="/auth/auth1/register" className="text-primary font-medium">Sign up</a> to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradePrompt;