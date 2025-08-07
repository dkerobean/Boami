'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/app/context/SubscriptionContext';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  Alert,
  Card,
  CardContent,
  Grid,
  Button,
  Chip
} from '@mui/material';
import { IconHome, IconCreditCard, IconArrowUp } from '@tabler/icons-react';
import { PricingPage } from '@/components/subscription';
import { PaymentModal } from '@/components/subscription/PaymentModal';
import toast from 'react-hot-toast';

const SubscriptionUpgradePage: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { subscription, currentPlan, loading: subscriptionLoading, refreshSubscription } = useSubscription();
  const router = useRouter();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUpgrade, setProcessingUpgrade] = useState(false);

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
    router.push('/auth/auth1/login?returnUrl=/subscription/upgrade');
    return null;
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/plans');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlans(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string, billingPeriod: 'monthly' | 'annual') => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    // Check if this is actually an upgrade
    if (currentPlan && currentPlan.id === planId) {
      toast.error('You are already on this plan');
      return;
    }

    setSelectedPlan(planId);
    setSelectedBillingPeriod(billingPeriod);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      setProcessingUpgrade(true);
      
      // Process the subscription upgrade
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
          billingPeriod: selectedBillingPeriod,
          paymentReference: paymentData.reference,
          isUpgrade: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Subscription upgraded successfully!');
          await refreshSubscription();
          setShowPaymentModal(false);
          router.push('/subscription/manage');
        } else {
          throw new Error(data.error || 'Upgrade failed');
        }
      } else {
        throw new Error('Failed to process upgrade');
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to upgrade subscription');
    } finally {
      setProcessingUpgrade(false);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  const getSelectedPlanDetails = () => {
    if (!selectedPlan) return null;
    return plans.find(p => p.id === selectedPlan);
  };

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
            href="/subscription/manage"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <IconCreditCard size={18} />
            Subscription
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconArrowUp size={18} />
            Upgrade Plan
          </Typography>
        </Breadcrumbs>

        <Typography variant="h4" fontWeight={600} gutterBottom>
          Upgrade Your Subscription
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose a higher plan to unlock more features and increase your limits
        </Typography>
      </Box>

      {/* Current Plan Info */}
      {currentPlan && (
        <Card sx={{ mb: 4, bgcolor: 'primary.light', border: '1px solid', borderColor: 'primary.main' }}>
          <CardContent>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h6" fontWeight={600}>
                  Current Plan: {currentPlan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {subscription?.billingPeriod === 'monthly' ? 'Monthly' : 'Annual'} billing
                </Typography>
              </Grid>
              <Grid item>
                <Chip
                  label={subscription?.status === 'active' ? 'Active' : subscription?.status}
                  color={subscription?.status === 'active' ? 'success' : 'default'}
                  variant="filled"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Notice */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Important Upgrade Information
        </Typography>
        <Typography variant="body2">
          • Your new plan will take effect immediately<br/>
          • You'll be charged the prorated amount for the remaining billing period<br/>
          • All your existing data and settings will be preserved<br/>
          • You can downgrade at any time from your subscription management page
        </Typography>
      </Alert>

      {/* Pricing Plans */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <Typography>Loading subscription plans...</Typography>
        </Box>
      ) : (
        <PricingPage
          onSelectPlan={handlePlanSelect}
          currentPlanId={currentPlan?.id}
          showTitle={false}
          showDescription={false}
          highlightPopular={true}
          className="max-w-none"
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          plan={getSelectedPlanDetails()}
          billingPeriod={selectedBillingPeriod}
          user={user}
          isUpgrade={true}
          processing={processingUpgrade}
        />
      )}

      {/* Help Section */}
      <Box mt={6}>
        <Alert severity="info">
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Need Help Choosing?
          </Typography>
          <Typography variant="body2">
            Not sure which plan is right for you?{' '}
            <Link href="/contact" underline="hover">
              Contact our sales team
            </Link>{' '}
            for personalized recommendations based on your needs.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
};

export default SubscriptionUpgradePage;