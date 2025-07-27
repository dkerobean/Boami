'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Grid,
  Collapse,
} from '@mui/material';
import {
  IconCrown,
  IconX,
  IconTrendingUp,
  IconShield,
  IconStar,
  IconCreditCard,
  IconCheck,
} from '@tabler/icons-react';
import { useSubscription } from '@/app/context/SubscriptionContext';
import { PaymentModal } from '@/components/subscription';

interface UpgradeBannerProps {
  variant?: 'compact' | 'full' | 'floating';
  showDismiss?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  variant = 'compact',
  showDismiss = true,
  onDismiss,
  className
}) => {
  const { subscription, isSubscriptionActive } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Don't show banner if user has active subscription
  if (isSubscriptionActive || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  if (variant === 'floating') {
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            maxWidth: 350,
          }}
          className={className}
        >
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: 3,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {showDismiss && (
                <IconButton
                  size="small"
                  onClick={handleDismiss}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <IconX size={16} />
                </IconButton>
              )}

              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <IconCrown size={24} color="#fbbf24" />
                <Typography variant="h6" fontWeight={600}>
                  Upgrade to Pro
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                Unlock unlimited projects, priority support, and advanced features.
              </Typography>

              <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                🎉 14-day FREE trial
              </Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={handleUpgrade}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'grey.100' },
                  fontWeight: 600
                }}
              >
                Start Free Trial
              </Button>
            </CardContent>
          </Card>
        </Box>

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={null} // Will show plan selection
          billingPeriod="monthly"
          onPaymentSuccess={() => setShowPaymentModal(false)}
        />
      </>
    );
  }

  if (variant === 'full') {
    return (
      <>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            mb: 3,
          }}
          className={className}
        >
          <CardContent sx={{ p: 4 }}>
            {showDismiss && (
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <IconX size={18} />
              </IconButton>
            )}

            <Box textAlign="center" mb={3}>
              <IconCrown size={48} color="#fbbf24" style={{ marginBottom: 16 }} />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Unlock Your Full Potential
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                You're currently on the free plan. Upgrade to access premium
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <IconTrendingUp size={32} style={{ marginBottom: 8 }} />
                  <Typography variant="body1" fontWeight={600}>Unlimited Projects</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>No limits on creativity</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <IconShield size={32} style={{ marginBottom: 8 }} />
                  <Typography variant="body1" fontWeight={600}>Priority Support</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Get help when needed</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <IconStar size={32} style={{ marginBottom: 8 }} />
                  <Typography variant="body1" fontWeight={600}>Advanced Analytics</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Deep insights</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <IconCreditCard size={32} style={{ marginBottom: 8 }} />
                  <Typography variant="body1" fontWeight={600}>No Setup Fees</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Start immediately</Typography>
                </Box>
              </Grid>
            </Grid>

            <Box textAlign="center">
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                🎉 Start with a FREE 14-day trial - No credit card required!
              </Typography>

              <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleUpgrade}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' },
                    fontWeight: 700,
                    px: 4
                  }}
                >
                  🚀 Start Free Trial
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="/subscription"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { borderColor: 'grey.300', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Compare Plans
                </Button>
              </Box>

              <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>
                Cancel anytime • No contracts • 24/7 support
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={null}
          billingPeriod="monthly"
          onPaymentSuccess={() => setShowPaymentModal(false)}
        />
      </>
    );
  }

  // Compact variant (default)
  return (
    <>
      <Card
        sx={{
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 2,
          cursor: expanded ? 'default' : 'pointer',
        }}
        onClick={() => !expanded && setExpanded(true)}
        className={className}
      >
        <CardContent sx={{ p: 2 }}>
          {showDismiss && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <IconX size={16} />
            </IconButton>
          )}

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <IconCrown size={24} color="#fbbf24" />
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Upgrade to Premium
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Unlock unlimited features • 14-day free trial
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleUpgrade();
              }}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
                fontWeight: 600,
                minWidth: 120
              }}
            >
              Start Trial
            </Button>
          </Box>

          <Collapse in={expanded}>
            <Box mt={2} pt={2} borderTop="1px solid rgba(255,255,255,0.2)">
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconCheck size={16} />
                    <Typography variant="body2">Unlimited Projects</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconCheck size={16} />
                    <Typography variant="body2">Priority Support</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconCheck size={16} />
                    <Typography variant="body2">Advanced Analytics</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconCheck size={16} />
                    <Typography variant="body2">No Setup Fees</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={null}
        billingPeriod="monthly"
        onPaymentSuccess={() => setShowPaymentModal(false)}
      />
    </>
  );
};

export default UpgradeBanner;