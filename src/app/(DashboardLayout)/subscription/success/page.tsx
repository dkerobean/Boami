'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { JWTClientManager } from '@/lib/auth/jwt-client';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { IconCheck, IconArrowRight, IconCrown, IconX } from '@tabler/icons-react';

const SubscriptionSuccessPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  // Get URL parameters
  const txRef = searchParams.get('tx_ref');
  const transactionId = searchParams.get('transaction_id');
  const planType = searchParams.get('plan');
  const status = searchParams.get('status');
  const paymentReference = searchParams.get('ref');

  useEffect(() => {
    const currentUser = JWTClientManager.getCurrentUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (user) {
      handleSubscriptionVerification();
    }
  }, [user]);

  const handleSubscriptionVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      // Handle free plan activation
      if (planType === 'free') {
        // For free plans, just fetch the user's current subscription
        const response = await fetch(`/api/subscriptions/user/${user.userId}`);
        const data = await response.json();

        if (data.success && data.data) {
          setSubscription(data.data);
        } else {
          throw new Error('Unable to fetch subscription details');
        }
        return;
      }

      // Handle paid plan verification
      if (txRef || transactionId || paymentReference) {
        setVerifying(true);
        
        const verifyResponse = await fetch('/api/subscriptions/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            txRef,
            transactionId,
            paymentReference,
            userId: user.userId
          }),
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
          setSubscription(verifyData.data.subscription);
        } else {
          throw new Error(verifyData.error || 'Payment verification failed');
        }
      } else {
        throw new Error('Missing transaction reference or plan information');
      }

    } catch (err: any) {
      console.error('Subscription verification error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboards/ecommerce');
  };

  const handleManageSubscription = () => {
    router.push('/subscription/manage');
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" flexDirection="column">
          <CircularProgress sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom>
            {verifying ? 'Verifying your payment...' : 'Processing your subscription...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we confirm your subscription details.
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: 'error.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 3
              }}
            >
              <IconX size={40} color="white" />
            </Box>

            <Typography variant="h4" fontWeight={600} gutterBottom color="error">
              Subscription Failed
            </Typography>

            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/subscription/plans')}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleGoToDashboard}
              >
                Back to Dashboard
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
        {/* Success Icon */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 3
            }}
          >
            <IconCheck size={40} color="white" />
          </Box>

          <Typography variant="h4" fontWeight={600} gutterBottom>
            Subscription Activated!
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Thank you for subscribing! Your payment has been processed successfully.
          </Typography>
        </Box>

        {/* Subscription Details */}
        {subscription && (
          <Box sx={{ mb: 4, p: 3, backgroundColor: 'background.default', borderRadius: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Subscription Details
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Plan:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconCrown size={16} color="#FFD700" />
                <Typography variant="body2" fontWeight={600}>
                  {subscription.plan?.name || subscription.planId?.name || 'N/A'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status:
              </Typography>
              <Chip 
                label={subscription.status || 'Active'} 
                color="success" 
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {subscription.plan?.price?.monthly > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Amount:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(subscription.plan.price.monthly, subscription.plan.currency || 'NGN')}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Billing Period:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {subscription.currentPeriodStart && subscription.currentPeriodEnd ?
                  `${new Date(subscription.currentPeriodStart).toLocaleDateString()} - ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` :
                  'N/A'
                }
              </Typography>
            </Box>

            {(paymentReference || txRef) && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Reference:
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                  {(paymentReference || txRef)?.slice(0, 12)}...
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* What's Next */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            What's Next?
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2">
              {subscription?.plan?.name === 'Free' || planType === 'free'
                ? 'Your free plan has been activated successfully! You can start using all the included features right away.'
                : 'Your subscription is now active! You can now access all premium features included in your plan. A confirmation email has been sent to your registered email address.'
              }
            </Typography>
          </Alert>

          {subscription?.plan?.features && (
            <Box sx={{ textAlign: 'left', mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                You now have access to:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {Object.entries(subscription.plan.features)
                  .filter(([_, feature]: [string, any]) => feature.enabled)
                  .slice(0, 5)
                  .map(([key, feature]: [string, any], index) => (
                    <Box component="li" key={index} sx={{ mb: 0.5 }}>
                      <Typography variant="body2">
                        {feature.description}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleGoToDashboard}
            endIcon={<IconArrowRight size={18} />}
          >
            Go to Dashboard
          </Button>

          <Button
            variant="outlined"
            size="large"
            onClick={handleManageSubscription}
          >
            Manage Subscription
          </Button>
        </Box>

        {/* Support */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Need help? <a href="/contact" style={{ color: 'inherit', textDecoration: 'underline' }}>Contact our support team</a>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default SubscriptionSuccessPage;