'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  FormGroup,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress
} from '@mui/material';
import { IconMail, IconCheck, IconX } from '@tabler/icons-react';

interface EmailPreferences {
  subscriptionConfirmation: boolean;
  paymentNotifications: boolean;
  renewalReminders: boolean;
  cancellationNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

const UnsubscribePage: React.FC = () => {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<EmailPreferences>({
    subscriptionConfirmation: true,
    paymentNotifications: true,
    renewalReminders: true,
    cancellationNotifications: true,
    marketingEmails: false,
    securityAlerts: true
  });

  const token = searchParams.get('token');
  const emailType = searchParams.get('type');
  const userId = searchParams.get('user');

  useEffect(() => {
    if (token && emailType && userId) {
      handleUnsubscribe();
    } else {
      setError('Invalid unsubscribe link. Please check the URL and try again.');
      setLoading(false);
    }
  }, [token, emailType, userId]);

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          emailType,
          userId
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      } else {
        setError(data.error || 'Failed to unsubscribe. Please try again.');
      }
    } catch (err: any) {
      setError('An error occurred while processing your request.');
      console.error('Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (preferenceKey: keyof EmailPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [preferenceKey]: !prev[preferenceKey]
    }));
  };

  const handleUpdatePreferences = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/email/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId,
          preferences
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to update preferences.');
      }
    } catch (err: any) {
      setError('An error occurred while updating your preferences.');
      console.error('Update preferences error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      subscriptionConfirmation: 'Subscription Confirmations',
      paymentNotifications: 'Payment Notifications',
      renewalReminders: 'Renewal Reminders',
      cancellationNotifications: 'Cancellation Notifications',
      marketingEmails: 'Marketing Emails',
      securityAlerts: 'Security Alerts'
    };
    return labels[type] || type;
  };

  const getEmailTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      subscriptionConfirmation: 'Confirmations when you subscribe or make changes to your subscription',
      paymentNotifications: 'Notifications about successful payments and payment failures',
      renewalReminders: 'Reminders before your subscription renews',
      cancellationNotifications: 'Confirmations when you cancel your subscription',
      marketingEmails: 'Promotional emails about new features and offers',
      securityAlerts: 'Important security notifications about your account'
    };
    return descriptions[type] || '';
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Processing your request...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={4}>
            <IconMail size={48} color="#1976d2" />
            <Typography variant="h4" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
              Email Preferences
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your email notification preferences
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} icon={<IconX />}>
              {error}
            </Alert>
          )}

          {success && !error && (
            <Alert severity="success" sx={{ mb: 3 }} icon={<IconCheck />}>
              {emailType
                ? `You have been unsubscribed from ${getEmailTypeLabel(emailType)}.`
                : 'Your email preferences have been updated successfully.'
              }
            </Alert>
          )}

          {!error && (
            <>
              <Typography variant="h6" gutterBottom>
                Email Notification Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose which types of emails you'd like to receive from us.
              </Typography>

              <FormGroup>
                {Object.entries(preferences).map(([key, value]) => (
                  <Box key={key} sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          onChange={() => handlePreferenceChange(key as keyof EmailPreferences)}
                          disabled={key === 'securityAlerts'} // Security alerts should always be enabled
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {getEmailTypeLabel(key)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getEmailTypeDescription(key)}
                          </Typography>
                          {key === 'securityAlerts' && (
                            <Typography variant="caption" color="warning.main">
                              Security alerts cannot be disabled for your account safety
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', ml: 0 }}
                    />
                    {key !== 'securityAlerts' && <Divider sx={{ mt: 1 }} />}
                  </Box>
                ))}
              </FormGroup>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleUpdatePreferences}
                  disabled={loading}
                  sx={{ minWidth: 200 }}
                >
                  {loading ? 'Updating...' : 'Update Preferences'}
                </Button>
              </Box>

              <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Need Help?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  If you're having trouble with your email preferences or need to contact us about your subscription,
                  please visit our <a href="/contact" style={{ color: 'inherit' }}>support page</a> or
                  email us directly at support@example.com.
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default UnsubscribePage;