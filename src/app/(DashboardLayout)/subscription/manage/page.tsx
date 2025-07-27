'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Breadcrumbs,
  Link,
  Alert
} from '@mui/material';
import { IconHome, IconCreditCard } from '@tabler/icons-react';
import { SubscriptionStatus, BillingHistory } from '@/components/subscription';
import { useSubscription } from '@/app/context/SubscriptionContext';

const SubscriptionManagePage: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();

  // Redirect to login if not authenticated
  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="h6" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!isAuthenticated) {
    router.push('/auth/auth1/login?returnUrl=/subscription/manage');
    return null;
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
            Subscription Management
          </Typography>
        </Breadcrumbs>

        <Typography variant="h4" fontWeight={600} gutterBottom>
          Manage Your Subscription
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your subscription plan, billing history, and payment methods
        </Typography>
      </Box>

      {/* Main Content */}
      <Grid container spacing={4}>
        {/* Subscription Status */}
        <Grid item xs={12}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <SubscriptionStatus
              userId={user?._id || ''}
              className="border-0 shadow-none"
            />
          </div>
        </Grid>

        {/* Billing History */}
        <Grid item xs={12}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <BillingHistory
              userId={user?._id || ''}
              limit={10}
              showPagination={true}
              className="border-0 shadow-none"
            />
          </div>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  component="button"
                  onClick={() => router.push('/subscription/plans')}
                  sx={{
                    width: '100%',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    View All Plans
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Compare subscription plans
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box
                  component="button"
                  onClick={() => router.push('/subscription/billing')}
                  sx={{
                    width: '100%',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Billing History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View all transactions
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box
                  component="button"
                  onClick={() => router.push('/subscription/payment-methods')}
                  sx={{
                    width: '100%',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Payment Methods
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage payment options
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box
                  component="button"
                  onClick={() => router.push('/contact')}
                  sx={{
                    width: '100%',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Contact Support
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Get help with billing
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Help Section */}
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Need Help?
            </Typography>
            <Typography variant="body2">
              If you have questions about your subscription or billing, please{' '}
              <Link href="/contact" underline="hover">
                contact our support team
              </Link>
              . We're here to help!
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SubscriptionManagePage;