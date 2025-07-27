'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  IconCheck,
  IconCrown,
  IconCreditCard,
  IconCalendar,
  IconTrendingUp,
  IconTrendingDown,
  IconX,
  IconAlertTriangle,
  IconShield,
  IconStar,
} from '@tabler/icons-react';
import { useSubscription } from '@/app/context/SubscriptionContext';
import { PaymentModal, BillingHistory } from '@/components/subscription';

interface SubscriptionManagementProps {
  userId: string;
}

interface Plan {
  id: string;
  name: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: string[];
  trialDays: number;
  popular?: boolean;
  limits: {
    projects: number;
    storage: number;
    apiCalls: number;
  };
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ userId }) => {
  const { subscription, loading, error, refreshSubscription, hasFeatureAccess, isSubscriptionActive } = useSubscription();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/subscriptions/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'info';
      case 'cancelled':
        return 'warning';
      case 'past_due':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <IconCheck size={16} />;
      case 'trialing':
        return <IconStar size={16} />;
      case 'cancelled':
        return <IconX size={16} />;
      case 'past_due':
        return <IconAlertTriangle size={16} />;
      default:
        return <IconShield size={16} />;
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        await refreshSubscription();
        setShowCancelDialog(false);
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setCancelling(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    await refreshSubscription();
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  if (loading || loadingPlans) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading subscription: {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Current Subscription Status */}
      {subscription && isSubscriptionActive ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <IconCrown size={20} color="#f59e0b" />
                  <Typography variant="h6" fontWeight={600}>
                    {subscription.plan?.name || 'Current Plan'}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(subscription.status)}
                    label={subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    color={getStatusColor(subscription.status) as any}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {subscription.billingPeriod === 'monthly' ? 'Monthly' : 'Annual'} billing
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="h5" fontWeight={600}>
                  {formatCurrency(
                    subscription.billingPeriod === 'monthly'
                      ? subscription.plan?.price?.monthly || 0
                      : subscription.plan?.price?.annual || 0,
                    subscription.plan?.price?.currency || 'USD'
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  per {subscription.billingPeriod === 'monthly' ? 'month' : 'year'}
                </Typography>
              </Box>
            </Box>

            {/* Next billing date */}
            {subscription.currentPeriodEnd && (
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <IconCalendar size={16} />
                <Typography variant="body2">
                  Next billing: {formatDate(subscription.currentPeriodEnd)}
                </Typography>
              </Box>
            )}

            {/* Usage Information */}
            {subscription.usage && subscription.limits && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Usage This Period
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Projects: {subscription.usage.projects} / {subscription.limits.projects === -1 ? '∞' : subscription.limits.projects}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getUsagePercentage(subscription.usage.projects, subscription.limits.projects)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Storage: {subscription.usage.storage}MB / {subscription.limits.storage === -1 ? '∞' : `${subscription.limits.storage}MB`}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getUsagePercentage(subscription.usage.storage, subscription.limits.storage)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        API Calls: {subscription.usage.apiCalls.toLocaleString()} / {subscription.limits.apiCalls === -1 ? '∞' : subscription.limits.apiCalls.toLocaleString()}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getUsagePercentage(subscription.usage.apiCalls, subscription.limits.apiCalls)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Action Buttons */}
            <Box display="flex" gap={2} mt={3}>
              <Button
                variant="contained"
                startIcon={<IconTrendingUp />}
                onClick={() => {
                  // Find a higher tier plan to upgrade to
                  const currentPlanIndex = plans.findIndex(p => p.id === subscription.plan?.id);
                  const nextPlan = plans[currentPlanIndex + 1];
                  if (nextPlan) {
                    handleUpgrade(nextPlan);
                  }
                }}
                disabled={!plans.find((p, index) => index > plans.findIndex(plan => plan.id === subscription.plan?.id))}
              >
                Upgrade Plan
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconCreditCard />}
                onClick={() => setShowBillingHistory(true)}
              >
                Billing History
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconX />}
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel Subscription
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        // No active subscription - Clear call to action
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <IconCrown size={48} color="#fbbf24" style={{ marginBottom: 16 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              You're Missing Out on Premium Features!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
              Upgrade now to unlock unlimited projects, priority support, and advanced analytics.
            </Typography>

            {/* Show current limitations */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
                Current Free Plan Limitations:
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                • Limited to 3 projects • Basic support only • No advanced analytics
              </Typography>
            </Box>

            {/* Pricing teaser */}
            {plans.length > 0 && (
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Starting from {formatCurrency(Math.min(...plans.map(p => p.price.monthly)), 'USD')}/month
              </Typography>
            )}

            <Typography variant="body2" sx={{ mb: 3, fontWeight: 600 }}>
              🎉 FREE 14-day trial • No credit card required • Cancel anytime
            </Typography>

            <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'grey.100' },
                  fontWeight: 700,
                  px: 4,
                  py: 1.5
                }}
                onClick={() => {
                  // Find the most popular plan or first plan
                  const popularPlan = plans.find(p => p.popular) || plans[0];
                  if (popularPlan) {
                    handleUpgrade(popularPlan);
                  }
                }}
              >
                🚀 Start Free Trial
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': { borderColor: 'grey.300', bgcolor: 'rgba(255,255,255,0.1)' },
                  px: 3,
                  py: 1.5
                }}
                onClick={() => {
                  // Navigate to full subscription page
                  window.location.href = '/subscription';
                }}
              >
                Compare All Plans
              </Button>
            </Box>

            <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>
              Join 10,000+ users who upgraded to premium
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Box id="available-plans">
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Available Plans
        </Typography>
      </Box>

      {/* Billing Period Toggle */}
      <Box display="flex" justifyContent="center" mb={3}>
        <Box display="flex" bgcolor="grey.100" borderRadius={1} p={0.5}>
          <Button
            variant={billingPeriod === 'monthly' ? 'contained' : 'text'}
            onClick={() => setBillingPeriod('monthly')}
            size="small"
          >
            Monthly
          </Button>
          <Button
            variant={billingPeriod === 'annual' ? 'contained' : 'text'}
            onClick={() => setBillingPeriod('annual')}
            size="small"
          >
            Annual
            <Chip label="Save 20%" size="small" color="success" sx={{ ml: 1 }} />
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan?.id === plan.id;
          const price = billingPeriod === 'monthly' ? plan.price.monthly : plan.price.annual;
          const monthlyPrice = billingPeriod === 'annual' ? plan.price.annual / 12 : plan.price.monthly;

          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  border: plan.popular ? 2 : 1,
                  borderColor: plan.popular ? 'primary.main' : 'divider',
                }}
              >
                {plan.popular && (
                  <Box
                    position="absolute"
                    top={-10}
                    left="50%"
                    sx={{ transform: 'translateX(-50%)' }}
                  >
                    <Chip label="Most Popular" color="primary" size="small" />
                  </Box>
                )}

                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {plan.name}
                  </Typography>

                  <Box mb={2}>
                    <Typography variant="h4" fontWeight={700}>
                      {formatCurrency(price, plan.price.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      per {billingPeriod === 'monthly' ? 'month' : 'year'}
                      {billingPeriod === 'annual' && (
                        <span> ({formatCurrency(monthlyPrice, plan.price.currency)}/mo)</span>
                      )}
                    </Typography>
                  </Box>

                  {plan.trialDays > 0 && (
                    <Chip
                      label={`${plan.trialDays}-day free trial`}
                      color="success"
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  )}

                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <IconCheck size={16} color="#10b981" />
                        </ListItemIcon>
                        <ListItemText
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Box mt={2}>
                    {isCurrentPlan ? (
                      <Button variant="outlined" fullWidth disabled>
                        ✓ Current Plan
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant={plan.popular ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => handleUpgrade(plan)}
                          sx={{
                            mb: 1,
                            fontWeight: 600,
                            ...(plan.popular && {
                              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
                              }
                            })
                          }}
                        >
                          {subscription && isSubscriptionActive ? 'Upgrade Now' : '🚀 Start Free Trial'}
                        </Button>
                        {plan.trialDays > 0 && !subscription && (
                          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                            {plan.trialDays} days free, then {formatCurrency(monthlyPrice, plan.price.currency)}/month
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={selectedPlan}
        billingPeriod={billingPeriod}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel your subscription? You'll lose access to premium features
            at the end of your current billing period.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>Keep Subscription</Button>
          <Button
            onClick={handleCancelSubscription}
            color="error"
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} /> : null}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Billing History Dialog */}
      <Dialog
        open={showBillingHistory}
        onClose={() => setShowBillingHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Billing History</DialogTitle>
        <DialogContent>
          <BillingHistory userId={userId} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBillingHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionManagement;