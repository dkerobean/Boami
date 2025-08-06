'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  CalendarIcon,
  CreditCardIcon,
  TrendingUpIcon
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils/format';

interface SubscriptionStatusProps {
  subscription?: {
    id: string;
    status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing' | 'none';
    plan?: {
      name: string;
      price: {
        monthly: number;
        annual: number;
        currency: string;
      };
    };
    billingPeriod?: 'monthly' | 'annual';
    currentPeriodEnd?: string;
    trialEnd?: string;
    cancelAtPeriodEnd?: boolean;
    usage?: {
      projects: number;
      storage: number;
      apiCalls: number;
    };
    limits?: {
      projects: number;
      storage: number;
      apiCalls: number;
    };
  };
  compact?: boolean;
  showUsage?: boolean;
  onUpgrade?: () => void;
  onManage?: () => void;
}

export default function SubscriptionStatus({
  subscription,
  compact = false,
  showUsage = true,
  onUpgrade,
  onManage
}: SubscriptionStatusProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircleIcon,
          label: 'Active',
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'trialing':
        return {
          icon: CalendarIcon,
          label: 'Free Trial',
          variant: 'secondary' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200'
        };
      case 'cancelled':
        return {
          icon: XCircleIcon,
          label: 'Cancelled',
          variant: 'destructive' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'past_due':
        return {
          icon: AlertCircleIcon,
          label: 'Past Due',
          variant: 'secondary' as const,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200'
        };
      case 'expired':
        return {
          icon: XCircleIcon,
          label: 'Expired',
          variant: 'outline' as const,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200'
        };
      default:
        return {
          icon: AlertCircleIcon,
          label: 'No Subscription',
          variant: 'outline' as const,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200'
        };
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatUsage = (used: number, limit: number) => {
    if (limit === -1) return `${used.toLocaleString()} / Unlimited`;
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
  };

  if (!subscription || subscription.status === 'none') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No Active Subscription</p>
              <p className="text-sm text-muted-foreground">
                Choose a plan to unlock premium features
              </p>
            </div>
          </div>
          {onUpgrade && (
            <Button onClick={onUpgrade} size="sm">
              <TrendingUpIcon className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(subscription.status);
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
          <span className="font-medium">{subscription.plan?.name || 'Unknown Plan'}</span>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        {onManage && (
          <Button variant="outline" size="sm" onClick={onManage}>
            Manage
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusInfo.bgColor}`}>
              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            </div>
            <div>
              <h3 className="font-semibold">{subscription.plan?.name || 'Unknown Plan'}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                {subscription.billingPeriod && (
                  <span className="text-sm text-muted-foreground capitalize">
                    {subscription.billingPeriod} billing
                  </span>
                )}
              </div>
            </div>
          </div>

          {subscription.plan && subscription.billingPeriod && (
            <div className="text-right">
              <div className="text-lg font-bold">
                {formatCurrency(
                  subscription.billingPeriod === 'monthly'
                    ? subscription.plan.price.monthly
                    : subscription.plan.price.annual,
                  subscription.plan.price.currency
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                per {subscription.billingPeriod === 'monthly' ? 'month' : 'year'}
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {subscription.status === 'trialing' && subscription.trialEnd && (
          <div className={`p-3 rounded-lg mb-4 ${statusInfo.bgColor}`}>
            <p className="text-sm font-medium">
              Your free trial ends on {formatDate(subscription.trialEnd)}
            </p>
          </div>
        )}

        {subscription.status === 'cancelled' && subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
          <div className="p-3 rounded-lg mb-4 bg-orange-50 border border-orange-200">
            <p className="text-sm font-medium text-orange-900">
              Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}

        {subscription.status === 'past_due' && (
          <div className="p-3 rounded-lg mb-4 bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-900">
              Payment failed. Please update your payment method to continue service.
            </p>
          </div>
        )}

        {/* Next Billing Date */}
        {subscription.currentPeriodEnd && ['active', 'trialing'].includes(subscription.status) && (
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-muted-foreground">Next billing date:</span>
            <span className="font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
          </div>
        )}

        {/* Usage Information */}
        {showUsage && subscription.usage && subscription.limits && (
          <div className="space-y-3 mb-4">
            <h4 className="font-medium text-sm">Usage This Period</h4>

            {/* Projects Usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Projects</span>
                <span>{formatUsage(subscription.usage.projects, subscription.limits.projects)}</span>
              </div>
              <Progress
                value={getUsagePercentage(subscription.usage.projects, subscription.limits.projects)}
                className="h-2"
              />
            </div>

            {/* Storage Usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Storage (MB)</span>
                <span>{formatUsage(subscription.usage.storage, subscription.limits.storage)}</span>
              </div>
              <Progress
                value={getUsagePercentage(subscription.usage.storage, subscription.limits.storage)}
                className="h-2"
              />
            </div>

            {/* API Calls Usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>API Calls</span>
                <span>{formatUsage(subscription.usage.apiCalls, subscription.limits.apiCalls)}</span>
              </div>
              <Progress
                value={getUsagePercentage(subscription.usage.apiCalls, subscription.limits.apiCalls)}
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4 border-t">
          {onUpgrade && (
            <Button onClick={onUpgrade} size="sm" className="flex-1">
              <TrendingUpIcon className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          )}
          {onManage && (
            <Button onClick={onManage} variant="outline" size="sm" className="flex-1">
              <CreditCardIcon className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}