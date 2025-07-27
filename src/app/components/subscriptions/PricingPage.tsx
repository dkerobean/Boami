'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../../lib/utils/payment-utils';

interface PlanFeature {
  name: string;
  enabled: boolean;
  limit?: number;
  description: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: Record<string, PlanFeature>;
  sortOrder: number;
  popular?: boolean;
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
}

interface PricingPageProps {
  currentPlanId?: string;
  onSelectPlan?: (planId: string, billingCycle: 'monthly' | 'annual') => void;
  showCurrentPlan?: boolean;
}

export default function PricingPage({
  currentPlanId,
  onSelectPlan,
  showCurrentPlan = true
}: PricingPageProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/plans');
      const result = await response.json();

      if (result.success) {
        setPlans(result.data);
      } else {
        setError(result.error || 'Failed to load pricing plans');
      }
    } catch (err) {
      setError('Failed to load pricing plans');
      console.error('Fetch plans error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    if (onSelectPlan) {
      onSelectPlan(planId, annualBilling ? 'annual' : 'monthly');
    }
  };

  const getPrice = (plan: Plan) => {
    return annualBilling ? plan.pricing.annual : plan.pricing.monthly;
  };

  const getPriceDisplay = (plan: Plan) => {
    const price = getPrice(plan);
    const formattedPrice = formatCurrency(price.amount, price.currency);

    if (annualBilling) {
      const monthlyEquivalent = formatCurrency(plan.pricing.annual.monthlyEquivalent, price.currency);
      return {
        main: formattedPrice,
        period: '/year',
        equivalent: `${monthlyEquivalent}/month`,
        savings: `Save ${plan.pricing.annual.discount}%`
      };
    }

    return {
      main: formattedPrice,
      period: '/month',
      equivalent: null,
      savings: null
    };
  };

  const renderFeatureList = (features: Record<string, PlanFeature>) => {
    const featureList = Object.entries(features).map(([key, feature]) => ({
      key,
      ...feature
    }));

    return (
      <List dense>
        {featureList.map((feature) => (
          <ListItem key={feature.key} sx={{ px: 0, py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {feature.enabled ? (
                <CheckIcon color="success" fontSize="small" />
              ) : (
                <CancelIcon color="disabled" fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" color={feature.enabled ? 'text.primary' : 'text.disabled'}>
                  {feature.description}
                  {feature.enabled && feature.limit && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {` (${feature.limit.toLocaleString()})`}
                    </Typography>
                  )}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary" mb={4}>
          Select the perfect plan for your needs. Upgrade or downgrade at any time.
        </Typography>

        {/* Billing Toggle */}
        <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
          <Typography variant="body1" color={!annualBilling ? 'primary' : 'text.secondary'}>
            Monthly
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={annualBilling}
                onChange={(e) => setAnnualBilling(e.target.checked)}
                color="primary"
              />
            }
            label=""
          />
          <Typography variant="body1" color={annualBilling ? 'primary' : 'text.secondary'}>
            Annual
          </Typography>
          {annualBilling && (
            <Chip
              label="Save up to 17%"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Pricing Cards */}
      <Grid container spacing={4} justifyContent="center">
        {plans.map((plan) => {
          const priceDisplay = getPriceDisplay(plan);
          const isCurrentPlan = currentPlanId === plan.id;
          const isPopular = plan.popular;

          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: isCurrentPlan ? 2 : 1,
                  borderColor: isCurrentPlan ? 'primary.main' : 'divider',
                  transform: isPopular ? 'scale(1.05)' : 'none',
                  zIndex: isPopular ? 1 : 0,
                  '&:hover': {
                    boxShadow: (theme) => theme.shadows[8],
                  }
                }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2
                    }}
                  >
                    <Chip
                      icon={<StarIcon />}
                      label="Most Popular"
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && showCurrentPlan && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 2
                    }}
                  >
                    <Chip
                      label="Current Plan"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  {/* Plan Header */}
                  <Box textAlign="center" mb={3}>
                    <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {plan.description}
                    </Typography>

                    {/* Price */}
                    <Box mb={2}>
                      <Typography variant="h3" component="div" fontWeight="bold" color="primary">
                        {priceDisplay.main}
                        <Typography component="span" variant="h6" color="text.secondary">
                          {priceDisplay.period}
                        </Typography>
                      </Typography>
                      {priceDisplay.equivalent && (
                        <Typography variant="body2" color="text.secondary">
                          {priceDisplay.equivalent}
                        </Typography>
                      )}
                      {priceDisplay.savings && (
                        <Typography variant="body2" color="success.main" fontWeight="medium">
                          {priceDisplay.savings}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Features */}
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                      What's included:
                    </Typography>
                    {renderFeatureList(plan.features)}
                  </Box>
                </CardContent>

                {/* Action Button */}
                <Box p={3} pt={0}>
                  <Button
                    fullWidth
                    variant={isCurrentPlan ? "outlined" : (isPopular ? "contained" : "outlined")}
                    color="primary"
                    size="large"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrentPlan || selectedPlan === plan.id}
                    sx={{ py: 1.5 }}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : selectedPlan === plan.id
                        ? 'Processing...'
                        : `Choose ${plan.name}`
                    }
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Additional Info */}
      <Box textAlign="center" mt={6}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          All plans include 24/7 customer support and a 30-day money-back guarantee.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Need a custom plan? <Button variant="text" size="small">Contact Sales</Button>
        </Typography>
      </Box>
    </Container>
  );
}