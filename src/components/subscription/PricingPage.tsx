'use client';

import React, { useState, useEffect } from 'react';
import { JWTClientManager } from '@/lib/auth/jwt-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconCheck, IconX } from '@tabler/icons-react';

// CheckIcon component for feature list
const CheckIcon = ({ className }: { className?: string }) => (
  <IconCheck className={className} />
);
import { formatCurrency } from '@/lib/utils/format';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: any; // Flexible feature configuration
  sortOrder: number;
  pricing: {
    monthly: {
      amount: number;
      period: string;
      currency: string;
    };
    annual: {
      amount: number;
      period: string;
      currency: string;
      discount: number;
      monthlyEquivalent: number;
    };
  };
  popular?: boolean;
}

interface PricingPageProps {
  onSelectPlan?: (planId: string, billingPeriod: 'monthly' | 'annual') => void;
  currentPlanId?: string;
  showTrialInfo?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  highlightPopular?: boolean;
  className?: string;
}

export function PricingPage({
  onSelectPlan,
  currentPlanId,
  showTrialInfo = true,
  showTitle = true,
  showDescription = true,
  highlightPopular = true,
  className
}: PricingPageProps) {
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = JWTClientManager.getCurrentUser();
    setUser(currentUser);
  }, []);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/subscriptions/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }

      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch plans');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    if (onSelectPlan) {
      onSelectPlan(planId, billingPeriod);
    }
  };

  const getPrice = (plan: Plan) => {
    return billingPeriod === 'monthly' ? plan.price.monthly : plan.price.annual;
  };

  const getSavings = (plan: Plan) => {
    if (billingPeriod === 'annual') {
      const monthlyCost = plan.price.monthly * 12;
      const annualCost = plan.price.annual;
      const savings = monthlyCost - annualCost;
      const savingsPercent = Math.round((savings / monthlyCost) * 100);
      return { amount: savings, percent: savingsPercent };
    }
    return null;
  };

  const formatLimit = (value: number) => {
    if (value === -1) return 'Unlimited';
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 py-12 ${className || ''}`}>
      {/* Header */}
      {(showTitle || showDescription) && (
        <div className="text-center mb-12">
          {showTitle && (
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          )}
          {showDescription && (
            <p className="text-xl text-muted-foreground mb-8">
              Select the perfect plan for your needs. Upgrade or downgrade at any time.
            </p>
          )}
        </div>
      )}

      {/* Billing Toggle */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center bg-muted rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'annual'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setBillingPeriod('annual')}
          >
            Annual
            <Badge variant="secondary" className="ml-2">
              Save up to 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id;
          const savings = getSavings(plan);
          const price = getPrice(plan);

          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular && highlightPopular
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border'
              } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.popular && highlightPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <p className="text-muted-foreground">{plan.description}</p>

                <div className="mt-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">
                      {formatCurrency(price, plan.price.currency)}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>

                  {savings && (
                    <div className="text-sm text-green-600 mt-2">
                      Save {formatCurrency(savings.amount, plan.price.currency)}
                      ({savings.percent}%) annually
                    </div>
                  )}

                  {showTrialInfo && (
                    <div className="text-sm text-muted-foreground mt-2">
                      14-day free trial
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Features List */}
                <div className="space-y-3 mb-6">
                  {Object.entries(plan.features || {}).map(([featureName, featureConfig]: [string, any], index) => {
                    if (!featureConfig?.enabled) return null;
                    return (
                      <div key={index} className="flex items-center">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">
                          {featureConfig.description || featureName}
                          {featureConfig.limit && (
                            <span className="ml-2 text-muted-foreground">
                              ({formatLimit(featureConfig.limit)})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Button */}
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan || selectedPlan === plan.id}
                >
                  {isCurrentPlan ? (
                    'Current Plan'
                  ) : selectedPlan === plan.id ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </Button>

                {isCurrentPlan && (
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    You're currently on this plan
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-16 text-center">
        <h3 className="text-2xl font-bold mb-4">Frequently Asked Questions</h3>
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto text-left">
          <div>
            <h4 className="font-medium mb-2">Can I change plans anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time.
              Changes take effect immediately with prorated billing.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">What happens to my data if I cancel?</h4>
            <p className="text-sm text-muted-foreground">
              Your data is retained for 30 days after cancellation,
              giving you time to reactivate or export your information.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Do you offer refunds?</h4>
            <p className="text-sm text-muted-foreground">
              We offer prorated refunds for annual plans when downgrading.
              Contact support for specific refund requests.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Is there a free trial?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, most plans include a free trial period.
              No credit card required to start your trial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;