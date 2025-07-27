'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { IconCheck, IconArrowRight } from '@tabler/icons-react';
import { useSubscription } from '@/app/context/SubscriptionContext';

const SubscriptionSuccessPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { refreshSubscription } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState<boolean>(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentReference = searchParams.get('ref');

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!user?._id || !paymentReference) {
        setLoading(false);
        return;
      }

      try {
        // Refresh subscription context
        await refreshSubscription();

        // Fetch the specific subscription details
        const response = await fetch(`/api/subscriptions/current?userId=${user._id}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSubscription(data.data);
          }
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionDetails();
  }, [user?._id, paymentReference, refreshSubscription]);

  const handleGoToDashboard = () => {
    router.push('/');
  };

  const handleManageSubscription = () => {
    router.push('/subscription/manage');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
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

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Plan:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {subscription.plan?.name}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status:
              </Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">
                Active
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Next Billing Date:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {subscription.currentPeriodEnd ?
                  new Date(subscription.currentPeriodEnd).toLocaleDateString() :
                  'N/A'
                }
              </Typography>
            </Box>

            {paymentReference && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Reference:
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                  {paymentReference.slice(0, 12)}...
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
              Your subscription is now active! You can now access all premium features included in your plan.
              A confirmation email has been sent to your registered email address.
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