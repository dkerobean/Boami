'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  LinearProgress,
  Divider,
  Menu,
  MenuItem,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Upgrade as UpgradeIcon,
  Cancel as CancelIcon,
  Refresh as RenewIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { formatCurrency, formatSubscriptionPeriod, getDaysUntilExpiry } from '../../../lib/utils/payment-utils';

interface SubscriptionData {
  id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  isActive: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
  plan: {
    id: string;
    name: string;
    description: string;
    price: {
      monthly: number;
      annual: number;
      currency: string;
    };
    features: Record<string, any>;
  };
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionCardProps {
  subscription: SubscriptionData;
  onUpgrade?: () => void;
  onDowngrade?: () => void;
  onCancel?: () => void;
  onRenew?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export default function SubscriptionCard({
  subscription,
  onUpgrade,
  onDowngrade,
  onCancel,
  onRenew,
  showActions = true,
  compact = false
}: SubscriptionCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'past_due':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending Payment';
      case 'past_due':
        return 'Payment Failed';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const getProgressValue = () => {
    if (subscription.daysUntilExpiry <= 0) return 100;

    const totalDays = Math.ceil(
      (new Date(subscription.currentPeriodEnd).getTime() -
       new Date(subscription.currentPeriodStart).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const daysUsed = totalDays - subscription.daysUntilExpiry;
    return Math.max(0, Math.min(100, (daysUsed / totalDays) * 100));
  };

  const isInTrial = subscription.trialEnd && new Date() < new Date(subscription.trialEnd);
  const billingCycle = subscription.metadata?.paymentMethod || 'monthly';
  const currentPrice = billingCycle === 'annual'
    ? subscription.plan.price.annual
    : subscription.plan.price.monthly;

  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" component="h2" gutterBottom>
                {subscription.plan.name}
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <Chip
                  label={getStatusText(subscription.status)}
                  color={getStatusColor(subscription.status) as any}
                  size="small"
                />
                {isInTrial && (
                  <Chip
                    label="Trial"
                    color="info"
                    size="small"
                    variant="outlined"
                  />
                )}
                {subscription.cancelAtPeriodEnd && (
                  <Chip
                    label="Ending Soon"
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            {showActions && (
              <IconButton onClick={handleMenuOpen} size="small">
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>

          {/* Price */}
          <Box mb={2}>
            <Typography variant="h4" component="div" color="primary" fontWeight="bold">
              {formatCurrency(currentPrice, subscription.plan.price.currency)}
              <Typography component="span" variant="body1" color="text.secondary">
                /{billingCycle === 'annual' ? 'year' : 'month'}
              </Typography>
            </Typography>
            {billingCycle === 'annual' && (
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(Math.round(subscription.plan.price.annual / 12), subscription.plan.price.currency)}/month
              </Typography>
            )}
          </Box>

          {!compact && (
            <>
              <Divider sx={{ mb: 2 }} />

              {/* Billing Period */}
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Period
                </Typography>
                <Typography variant="body1">
                  {formatSubscriptionPeriod(
                    new Date(subscription.currentPeriodStart),
                    new Date(subscription.currentPeriodEnd)
                  )}
                </Typography>

                {/* Progress Bar */}
                {subscription.isActive && (
                  <Box mt={1}>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressValue()}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {subscription.daysUntilExpiry > 0
                        ? `${subscription.daysUntilExpiry} days remaining`
                        : 'Expired'
                      }
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Status Messages */}
              {subscription.status === 'past_due' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Payment failed. Please update your payment method.
                </Alert>
              )}

              {subscription.cancelAtPeriodEnd && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                </Alert>
              )}

              {subscription.status === 'pending' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Complete your payment to activate your subscription.
                </Alert>
              )}
            </>
          )}
        </CardContent>

        {/* Actions */}
        {showActions && (
          <CardActions sx={{ p: 2, pt: 0 }}>
            <Button
              startIcon={<InfoIcon />}
              onClick={() => setShowDetails(true)}
              size="small"
            >
              View Details
            </Button>

            {subscription.isActive && !subscription.cancelAtPeriodEnd && (
              <Button
                startIcon={<UpgradeIcon />}
                onClick={onUpgrade}
                size="small"
                color="primary"
              >
                Upgrade
              </Button>
            )}
          </CardActions>
        )}
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {subscription.isActive && !subscription.cancelAtPeriodEnd && (
          <MenuItem onClick={() => { handleMenuClose(); onUpgrade?.(); }}>
            <UpgradeIcon sx={{ mr: 1 }} />
            Upgrade Plan
          </MenuItem>
        )}

        {subscription.isActive && !subscription.cancelAtPeriodEnd && (
          <MenuItem onClick={() => { handleMenuClose(); onDowngrade?.(); }}>
            Downgrade Plan
          </MenuItem>
        )}

        {subscription.isActive && !subscription.cancelAtPeriodEnd && (
          <MenuItem
            onClick={() => {
              handleMenuClose();
              setShowCancelDialog(true);
            }}
            sx={{ color: 'error.main' }}
          >
            <CancelIcon sx={{ mr: 1 }} />
            Cancel Subscription
          </MenuItem>
        )}

        {subscription.cancelAtPeriodEnd && (
          <MenuItem onClick={() => { handleMenuClose(); onRenew?.(); }}>
            <RenewIcon sx={{ mr: 1 }} />
            Reactivate
          </MenuItem>
        )}

        <MenuItem onClick={() => { handleMenuClose(); setShowDetails(true); }}>
          <InfoIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
      </Menu>

      {/* Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subscription Details</DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemText
                primary="Plan"
                secondary={subscription.plan.name}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Status"
                secondary={getStatusText(subscription.status)}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Billing Cycle"
                secondary={billingCycle === 'annual' ? 'Annual' : 'Monthly'}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Current Period"
                secondary={formatSubscriptionPeriod(
                  new Date(subscription.currentPeriodStart),
                  new Date(subscription.currentPeriodEnd)
                )}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Next Billing Date"
                secondary={new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Subscription ID"
                secondary={subscription.id}
              />
            </ListItem>
            {isInTrial && (
              <ListItem>
                <ListItemText
                  primary="Trial Ends"
                  secondary={new Date(subscription.trialEnd!).toLocaleDateString()}
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel your subscription? You'll continue to have access
            until the end of your current billing period ({new Date(subscription.currentPeriodEnd).toLocaleDateString()}).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>Keep Subscription</Button>
          <Button
            onClick={() => {
              setShowCancelDialog(false);
              onCancel?.();
            }}
            color="error"
          >
            Cancel Subscription
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}