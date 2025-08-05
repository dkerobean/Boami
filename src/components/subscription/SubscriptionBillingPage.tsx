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
  Container,
  Breadcrumbs,
  Link,
  Paper,
  Tab,
  Tabs,
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
  IconHome,
  IconReceipt,
  IconSettings,
} from '@tabler/icons-react';
import { useSubscription } from '@/app/context/SubscriptionContext';
import { PaymentModal, BillingHistory } from '@/components/subscription';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: {
    [key: string]: {
      enabled: boolean;
      limit: number;
      description: string;
    };
  };
  isActive: boolean;
  sortOrder: number;
  popular?: boolean;
  trialDays?: number;
  savings?: {
    annual: number;
    monthsFreeBenefit: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`subscription-tabpanel-${index}`}
      aria-labelledby={`subscription-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const SubscriptionBillingPage: React.FC = () => {
  const { subscription, loading, error, refreshSubscription, hasFeatureAccess, isSubscriptionActive } = useSubscription();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [tabValue, setTabValue] = useState(0);

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading || loadingPlans) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading subscription: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <IconHome size={18} />
            Home
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconCreditCard size={18} />
            Subscription & Billing
          </Typography>
        </Breadcrumbs>

        <Typography variant="h4" fontWeight={600} gutterBottom>
          Subscription & Billing
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your subscription plan, billing information, and payment history
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="subscription tabs">
          <Tab
            label="Current Plan"
            icon={<IconCrown size={18} />}
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab
            label="Available Plans"
            icon={<IconTrendingUp size={18} />}
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab
            label="Billing History"
            icon={<IconReceipt size={18} />}
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Paper>

      {/* Current Plan Tab */}
      <TabPanel value={tabValue} index={0}>
        {subscription && isSubscriptionActive ? (
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <IconCrown size={24} color="#f59e0b" />
                    <Typography variant="h5" fontWeight={600}>
                      {subscription.plan?.name || 'Current Plan'}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(subscription.status)}
                      label={subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      color={getStatusColor(subscription.status) as any}
                      size="medium"
                    />
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    {subscription.billingPeriod === 'monthly' ? 'Monthly' : 'Annual'} billing
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="h4" fontWeight={600}>
                    {formatCurrency(
                      subscription.billingPeriod === 'monthly'
                        ? subscription.plan?.price?.monthly || 0
                        : subscription.plan?.price?.annual || 0,
                      subscription.plan?.price?.currency || 'USD'
                    )}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    per {subscription.billingPeriod === 'monthly' ? 'month' : 'year'}
                  </Typography>
                </Box>
              </Box>

              {/* Next billing date */}
              {subscription.currentPeriodEnd && (
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <IconCalendar size={20} />
                  <Typography variant="body1">
                    Next billing: {formatDate(subscription.currentPeriodEnd)}
                  </Typography>
                </Box>
              )}

              {/* Usage Information */}
              {subscription.usage && subscription.limits && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Usage This Period
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          Projects: {subscription.usage.projects} / {subscription.limits.projects === -1 ? '∞' : subscription.limits.projects}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={getUsagePercentage(subscription.usage.projects, subscription.limits.projects)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          Storage: {subscription.usage.storage}MB / {subscription.limits.storage === -1 ? '∞' : `${subscription.limits.storage}MB`}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={getUsagePercentage(subscription.usage.storage, subscription.limits.storage)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          API Calls: {subscription.usage.apiCalls.toLocaleString()} / {subscription.limits.apiCalls === -1 ? '∞' : subscription.limits.apiCalls.toLocaleString()}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={getUsagePercentage(subscription.usage.apiCalls, subscription.limits.apiCalls)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Action Buttons */}
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<IconTrendingUp />}
                  onClick={() => {
                    // Find a higher tier plan to upgrade to
                    const currentPlanIndex = plans.findIndex(p => p.id === subscription.plan?.id);
                    const nextPlan = plans[currentPlanIndex + 1];
                    if (nextPlan) {
                      handleUpgrade(nextPlan);
                    } else {
                      setTabValue(1); // Switch to available plans tab
                    }
                  }}
                >
                  Upgrade Plan
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<IconReceipt />}
                  onClick={() => setTabValue(2)}
                >
                  View Billing History
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  startIcon={<IconX />}
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Subscription
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            mb: 3
          }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <IconCrown size={64} color="#fbbf24" style={{ marginBottom: 16 }} />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Unlock Your Full Potential
              </Typography>
              <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
                You're currently on the free plan. Upgrade to access premium features, unlimited projects, and priority support.
              </Typography>

              {/* Feature highlights */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <Box>
                    <IconTrendingUp size={32} style={{ marginBottom: 8 }} />
                    <Typography variant="body1" fontWeight={600}>Unlimited Projects</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <IconShield size={32} style={{ marginBottom: 8 }} />
                    <Typography variant="body1" fontWeight={600}>Priority Support</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <IconStar size={32} style={{ marginBottom: 8 }} />
                    <Typography variant="body1" fontWeight={600}>Advanced Analytics</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <IconCreditCard size={32} style={{ marginBottom: 8 }} />
                    <Typography variant="body1" fontWeight={600}>No Setup Fees</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="body1" sx={{ mb: 3, fontWeight: 600 }}>
                🎉 Start with a FREE 14-day trial - No credit card required!
              </Typography>

              <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    setTabValue(1);
                    // Find the most popular plan and trigger upgrade
                    const popularPlan = plans.find(p => p.popular) || plans[0];
                    if (popularPlan) {
                      setTimeout(() => handleUpgrade(popularPlan), 100);
                    }
                  }}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' },
                    fontWeight: 700,
                    px: 6,
                    py: 2,
                    fontSize: '1.1rem',
                    borderRadius: 3,
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    '&:hover': {
                      bgcolor: 'grey.100',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 35px rgba(0,0,0,0.2)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  🚀 Start Free Trial Now
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => setTabValue(1)}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'grey.300',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-2px)'
                    },
                    px: 4,
                    py: 2,
                    fontSize: '1rem',
                    borderRadius: 3,
                    transition: 'all 0.3s ease'
                  }}
                >
                  Compare Plans
                </Button>
              </Box>

              <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>
                Cancel anytime • No long-term contracts • 24/7 support
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Available Plans Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Hero Section with Clear Value Proposition */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            p: 4,
            mb: 4,
            textAlign: 'center',
            color: 'white'
          }}
        >
          <IconCrown size={48} color="#fbbf24" style={{ marginBottom: 16 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Unlock Premium Features
          </Typography>
          <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
            Get unlimited access to all features, priority support, and advanced tools to supercharge your productivity.
          </Typography>

          {/* Key Benefits */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Box>
                <IconTrendingUp size={32} style={{ marginBottom: 8 }} />
                <Typography variant="body1" fontWeight={600}>Unlimited Projects</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>No limits on your creativity</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <IconShield size={32} style={{ marginBottom: 8 }} />
                <Typography variant="body1" fontWeight={600}>Priority Support</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Get help when you need it</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <IconStar size={32} style={{ marginBottom: 8 }} />
                <Typography variant="body1" fontWeight={600}>Advanced Analytics</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Deep insights into your data</Typography>
              </Box>
            </Grid>
          </Grid>

          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
            🎉 Start with a FREE 14-day trial - No credit card required!
          </Typography>
        </Box>

        <Box mb={4}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Choose Your Plan
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Select the perfect plan for your needs. All plans include a free trial period.
          </Typography>

          {/* Quick Action for Most Popular Plan */}
          {!subscription && (
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                p: 3,
                borderRadius: 3,
                mb: 4,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                🎯 Recommended: Start with our most popular plan
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
                Join thousands of users who chose our Professional plan
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  const popularPlan = plans.find(p => p.popular) || plans[0];
                  if (popularPlan) {
                    handleUpgrade(popularPlan);
                  }
                }}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'grey.100',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                🚀 Start 14-Day Free Trial
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
                No credit card required • Cancel anytime
              </Typography>
            </Box>
          )}

          {/* Billing Period Toggle */}
          <Box display="flex" justifyContent="center" mb={4}>
            <Box display="flex" bgcolor="grey.100" borderRadius={2} p={0.5}>
              <Button
                variant={billingPeriod === 'monthly' ? 'contained' : 'text'}
                onClick={() => setBillingPeriod('monthly')}
                sx={{ borderRadius: 1.5, px: 3 }}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === 'annual' ? 'contained' : 'text'}
                onClick={() => setBillingPeriod('annual')}
                sx={{ borderRadius: 1.5, px: 3 }}
              >
                Annual
                <Chip label="Save 20%" size="small" color="success" sx={{ ml: 1 }} />
              </Button>
            </Box>
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
                    transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.2s ease-in-out',
                  }}
                >
                  {plan.popular && (
                    <Box
                      position="absolute"
                      top={-12}
                      left="50%"
                      sx={{ transform: 'translateX(-50%)' }}
                    >
                      <Chip label="Most Popular" color="primary" />
                    </Box>
                  )}

                  <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                      {plan.name}
                    </Typography>

                    <Box mb={3}>
                      <Typography variant="h3" fontWeight={700}>
                        {formatCurrency(price, plan.price.currency)}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
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
                        sx={{ mb: 3, alignSelf: 'flex-start' }}
                      />
                    )}

                    <List dense sx={{ flexGrow: 1 }}>
                      {Object.entries(plan.features)
                        .filter(([_, featureConfig]) => featureConfig.enabled)
                        .map(([featureName, featureConfig], index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <IconCheck size={18} color="#10b981" />
                            </ListItemIcon>
                            <ListItemText
                              primary={featureConfig.description}
                              primaryTypographyProps={{ variant: 'body1' }}
                            />
                          </ListItem>
                        ))
                      }
                    </List>

                    <Box mt={3}>
                      {isCurrentPlan ? (
                        <Button variant="outlined" fullWidth size="large" disabled>
                          ✓ Current Plan
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant={plan.popular ? 'contained' : 'outlined'}
                            fullWidth
                            size="large"
                            onClick={() => handleUpgrade(plan)}
                            sx={{
                              mb: 1,
                              fontWeight: 700,
                              py: 1.5,
                              fontSize: '1rem',
                              borderRadius: 2,
                              textTransform: 'none',
                              boxShadow: plan.popular ? '0 6px 20px rgba(102, 126, 234, 0.4)' : 'none',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: plan.popular
                                  ? '0 8px 25px rgba(102, 126, 234, 0.5)'
                                  : '0 4px 15px rgba(0,0,0,0.1)',
                              },
                              transition: 'all 0.3s ease',
                              ...(plan.popular && {
                                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                                '&:hover': {
                                  background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.5)',
                                }
                              })
                            }}
                          >
                            {subscription && isSubscriptionActive ? (
                              <>
                                <IconTrendingUp size={18} style={{ marginRight: 8 }} />
                                Upgrade to {plan.name}
                              </>
                            ) : (
                              <>
                                {plan.name === 'Free' ? (
                                  '🚀 Start Free'
                                ) : (
                                  `🚀 Start ${plan.trialDays}-Day Free Trial`
                                )}
                              </>
                            )}
                          </Button>
                          {plan.trialDays > 0 && (
                            <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ fontWeight: 500 }}>
                              {plan.trialDays} days free, then {formatCurrency(monthlyPrice, plan.price.currency)}/month
                            </Typography>
                          )}
                          {!subscription && (
                            <Typography variant="caption" color="success.main" display="block" textAlign="center" sx={{ mt: 0.5, fontWeight: 600 }}>
                              ✨ No credit card required
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
      </TabPanel>

      {/* Billing History Tab */}
      <TabPanel value={tabValue} index={2}>
        <BillingHistory />
      </TabPanel>

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
    </Container>
  );
};

export default SubscriptionBillingPage;