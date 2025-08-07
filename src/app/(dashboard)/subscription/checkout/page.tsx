'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Breadcrumbs,
  Link,
  Alert,
  Button,
  Divider,
  CircularProgress
} from '@mui/material';
import { IconHome, IconShoppingCart, IconCheck } from '@tabler/icons-react';
import { PaymentModal } from '@/components/subscription';
import { formatCurrency } from '@/lib/utils/payment-utils';

const CheckoutPage: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);

  const planId = searchParams.get('planId');
  const billingPeriod = (searchParams.get('billingPeriod') as 'monthly' | 'annual') || 'monthly';

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push(`/auth/auth1/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!planId) {
      router.push('/subscription/plans');
      return;
    }

    const fetchPlan = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/subscriptions/plans/${planId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch plan details');
        }

        const data = await response.json();

        if (data.success && data.data) {
          setPlan(data.data);
        } else {
          throw new Error(data.error || 'Plan not found');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching plan:', err);
      } finally {
        setLoading(false);
      }
    };

    if (planId && isAuthenticated) {
      fetchPlan();
    }
  }, [planId, isAuthenticated, authLoading, router]);

  const handleSubscribe = async () => {
    if (!user?._id || !plan) return;

    try {
      setProcessing(true);

      // Create subscription and get payment reference
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user._id,
          planId: plan.id,
          billingPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPaymentReference(data.data.paymentReference);
        setShowPaymentModal(true);
      } else {
        throw new Error(data.error || 'Failed to create subscription');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating subscription:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      // Verify payment on the server
      const verifyResponse = await fetch('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: response.transaction_id,
          fleReference: response.tx_ref,
        }),
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        if (verifyData.success) {
          // Redirect to success page
          router.push('/subscription/success?ref=' + response.tx_ref);
        } else {
          setError('Payment verification failed. Please contact support.');
        }
      } else {
        setError('Payment verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setError('Payment verification failed. Please contact support.');
    } finally {
      setShowPaymentModal(false);
    }
  };

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    setError('Payment failed. Please try again.');
    setShowPaymentModal(false);
  };

  if (authLoading || loading) {
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button onClick={() => router.push('/subscription/plans')}>
          Back to Plans
        </Button>
      </Container>
    );
  }

  if (!plan) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Plan not found.
        </Alert>
        <Button onClick={() => router.push('/subscription/plans')}>
          Back to Plans
        </Button>
      </Container>
    );
  }

  const price = billingPeriod === 'monthly' ? plan.price.monthly : plan.price.annual;
  const formattedPrice = formatCurrency(price, plan.price.currency);
  const period = billingPeriod === 'monthly' ? 'month' : 'year';

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
          <Link
            underline="hover"
            color="inherit"
            href="/subscription/plans"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Subscription Plans
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconShoppingCart size={18} />
            Checkout
          </Typography>
        </Breadcrumbs>

        <Typography variant="h4" fontWeight={600} gutterBottom>
          Complete Your Subscription
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review your plan details and complete your purchase
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Order Summary */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Order Summary
            </Typography>

            <Box sx={{ py: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                  <Typography variant="h6" fontWeight={600}>
                    {plan.name} Plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Billed {billingPeriod}
                  </Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" fontWeight={600}>
                    {formattedPrice}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    per {period}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box sx={{ py: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                What's included:
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(plan.features || {})
                  .filter(([_, feature]: [string, any]) => feature.enabled)
                  .map(([key, feature]: [string, any], index) => (
                    <Grid item xs={12} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconCheck size={16} color="green" />
                        <Typography variant="body2">
                          {feature.description}
                          {feature.limit && (
                            <span style={{ fontWeight: 600 }}> ({feature.limit.toLocaleString()})</span>
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
              </Grid>
            </Box>

            <Divider />

            <Box sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={600}>
                Total
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {formattedPrice}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Payment Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Payment
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Your subscription will start immediately after payment confirmation.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubscribe}
              disabled={processing}
              sx={{ mb: 2 }}
            >
              {processing ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Processing...
                </>
              ) : (
                `Subscribe for ${formattedPrice}/${period}`
              )}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Secure payment powered by Flutterwave
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Payment Modal */}
      {showPaymentModal && user && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={plan}
          billingPeriod={billingPeriod}
          user={user}
          onSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentFailure}
        />
      )}
    </Container>
  );
};

export default CheckoutPage;