'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
  CreditCardIcon,
  CalendarIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface Subscription {
  id: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
  plan: {
    id: string;
    name: string;
    price: {
      monthly: number;
      annual: number;
      currency: string;
    };
    features: string[];
    limits: {
      projects: number;rage: number;
      apiCalls: number;
    };
  };
  billingPeriod: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  usage?: {
    projects: number;
    storage: number;
    apiCalls: number;
  };
}

interface SubscriptionCardProps {
  subscription: Subscription | null;
  loading?: boolean;
  onUpgrade?: () => void;
  onDowngrade?: () => void;
  onCancel?: () => void;
  onReactivate?: () => void;
  onManageBilling?: () => void;
}

export default function SubscriptionCard({
  subscription,
  loading = false,
  onUpgrade,
  onDowngrade,
  onCancel,
  onReactivate,
  onManageBilling
}: SubscriptionCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string, callback?: () => void) => {
    if (!callback) return;

    setActionLoading(action);
    try {
      await callback();
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'trialing':
        return (
          <Badge variant="secondary" className="flex items-center">
            <CalendarIcon className="h-3 w-3 mr-1" />
            Trial
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="flex items-center">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'past_due':
        return (
          <Badge variant="secondary" className="flex items-center">
            <AlertCircleIcon className="h-3 w-3 mr-1" />
            Past Due
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="flex items-center">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You don't have an active subscription. Choose a plan to get started.
          </p>
          <Button onClick={onUpgrade} className="w-full">
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentPrice = subscription.billingPeriod === 'monthly'
    ? subscription.plan.price.monthly
    : subscription.plan.price.annual;

  const isTrialing = subscription.status === 'trialing';
  const isCancelled = subscription.status === 'cancelled';
  const isPastDue = subscription.status === 'past_due';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>{subscription.plan.name} Plan</span>
            {getStatusBadge(subscription.status)}
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatCurrency(currentPrice, subscription.plan.price.currency)}
            </div>
            <div className="text-sm text-muted-foreground">
              per {subscription.billingPeriod === 'monthly' ? 'month' : 'year'}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trial Information */}
        {isTrialing && subscription.trialEnd && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Free Trial</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Your trial ends on {formatDate(subscription.trialEnd)}
            </p>
          </div>
        )}

        {/* Cancellation Notice */}
        {isCancelled && subscription.cancelAtPeriodEnd && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircleIcon className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-900">Subscription Ending</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}

        {/* Past Due Notice */}
        {isPastDue && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircleIcon className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900">Payment Required</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Please update your payment method to continue service
            </p>
          </div>
        )}

        {/* Billing Information */}
        <div className="space-y-3">
          <h4 className="font-medium">Billing Information</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Period:</span>
              <span>
                {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Cycle:</span>
              <span className="capitalize">{subscription.billingPeriod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Billing:</span>
              <span>
                {isCancelled ? 'N/A' : formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        {subscription.usage && (
          <div className="space-y-3">
            <h4 className="font-medium">Usage This Period</h4>
            <div className="space-y-3">
              {/* Projects Usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Projects</span>
                  <span>{formatUsage(subscription.usage.projects, subscription.plan.limits.projects)}</span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription.usage.projects, subscription.plan.limits.projects)}
                  className="h-2"
                />
              </div>

              {/* Storage Usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage (MB)</span>
                  <span>{formatUsage((subscription.usage as any).storage || 0, (subscription.plan.limits as any).storage || 0)}</span>
                </div>
                <Progress
                  value={getUsagePercentage((subscription.usage as any).storage || 0, (subscription.plan.limits as any).storage || 0)}
                  className="h-2"
                />
              </div>

              {/* API Calls Usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>API Calls</span>
                  <span>{formatUsage(subscription.usage.apiCalls, subscription.plan.limits.apiCalls)}</span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription.usage.apiCalls, subscription.plan.limits.apiCalls)}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Plan Features */}
        <div className="space-y-3">
          <h4 className="font-medium">Plan Features</h4>
          <div className="grid gap-2">
            {subscription.plan.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t">
          {subscription.status === 'active' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => handleAction('upgrade', onUpgrade)}
                disabled={actionLoading === 'upgrade'}
              >
                {actionLoading === 'upgrade' ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUpIcon className="h-4 w-4 mr-2" />
                    Upgrade
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction('cancel', onCancel)}
                disabled={actionLoading === 'cancel'}
              >
                {actionLoading === 'cancel' ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Cancel Plan'
                )}
              </Button>
            </div>
          )}

          {isCancelled && subscription.cancelAtPeriodEnd && (
            <Button
              onClick={() => handleAction('reactivate', onReactivate)}
              disabled={actionLoading === 'reactivate'}
              className="w-full"
            >
              {actionLoading === 'reactivate' ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Reactivating...
                </>
              ) : (
                'Reactivate Subscription'
              )}
            </Button>
          )}

          {isPastDue && (
            <Button
              onClick={() => handleAction('billing', onManageBilling)}
              disabled={actionLoading === 'billing'}
              className="w-full"
            >
              {actionLoading === 'billing' ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Update Payment Method
                </>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => handleAction('billing', onManageBilling)}
            disabled={actionLoading === 'billing'}
            className="w-full"
          >
            {actionLoading === 'billing' ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              <>
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Manage Billing
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}