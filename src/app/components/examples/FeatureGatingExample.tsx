import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Chip
} from '@mui/material';
import {
  IconDownload,
  IconChartBar,
  IconApi,
  IconUsers,
  IconBrandSlack,
  IconCloudUpload
} from '@tabler/icons-react';
import { FeatureGateWrapper, SubscriptionIndicator } from '@/components/subscription';
import { useFeatureAccess, FEATURES } from '@/hooks/useFeatureAccess';

const FeatureGatingExample: React.FC = () => {
  const { hasAccess, requireAccess, checkAndRedirect } = useFeatureAccess();
  const [alertMessage, setAlertMessage] = useState<string>('');

  const handleFeatureClick = (feature: string, featureName: string) => {
    const hasFeatureAccess = requireAccess(feature, {
      showAlert: true,
      alertMessage: `${featureName} requires a premium subscription. Please upgrade to continue.`,
      onAccessDenied: () => {
        setAlertMessage(`Access denied: ${featureName} is a premium feature.`);
      }
    });

    if (hasFeatureAccess) {
      setAlertMessage(`✅ Access granted: You can use ${featureName}!`);
    }
  };

  const handleFeatureRedirect = (feature: string) => {
    checkAndRedirect(feature);
  };

  const features = [
    {
      id: FEATURES.BULK_OPERATIONS,
      name: 'Bulk Operations',
      description: 'Export and import data in bulk',
      icon: IconDownload,
      color: 'primary'
    },
    {
      id: FEATURES.ADVANCED_ANALYTICS,
      name: 'Advanced Analytics',
      description: 'Detailed insights and reporting',
      icon: IconChartBar,
      color: 'secondary'
    },
    {
      id: FEATURES.API_ACCESS,
      name: 'API Access',
      description: 'Programmatic access to your data',
      icon: IconApi,
      color: 'success'
    },
    {
      id: FEATURES.TEAM_COLLABORATION,
      name: 'Team Collaboration',
      description: 'Share and collaborate with team members',
      icon: IconUsers,
      color: 'info'
    },
    {
      id: FEATURES.INTEGRATIONS,
      name: 'Third-party Integrations',
      description: 'Connect with external services',
      icon: IconBrandSlack,
      color: 'warning'
    },
    {
      id: FEATURES.UNLIMITED_STORAGE,
      name: 'Unlimited Storage',
      description: 'Store unlimited files and data',
      icon: IconCloudUpload,
      color: 'error'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Feature Access Control Demo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page demonstrates how feature gating works throughout the application
          </Typography>
        </div>
        <SubscriptionIndicator />
      </Box>

      {alertMessage && (
        <Alert
          severity={alertMessage.includes('✅') ? 'success' : 'warning'}
          sx={{ mb: 3 }}
          onClose={() => setAlertMessage('')}
        >
          {alertMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {features.map((feature) => {
          const hasFeatureAccess = hasAccess(feature.id);
          const IconComponent = feature.icon;

          return (
            <Grid item xs={12} md={6} lg={4} key={feature.id}>
              <Card
                sx={{
                  height: '100%',
                  opacity: hasFeatureAccess ? 1 : 0.7,
                  border: hasFeatureAccess ? '2px solid' : '1px solid',
                  borderColor: hasFeatureAccess ? 'success.main' : 'divider'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconComponent size={24} />
                    <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                      {feature.name}
                    </Typography>
                    <Box sx={{ ml: 'auto' }}>
                      <Chip
                        label={hasFeatureAccess ? 'Available' : 'Premium'}
                        color={hasFeatureAccess ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {feature.description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant={hasFeatureAccess ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleFeatureClick(feature.id, feature.name)}
                      disabled={!hasFeatureAccess}
                    >
                      {hasFeatureAccess ? 'Use Feature' : 'Requires Premium'}
                    </Button>

                    {!hasFeatureAccess && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleFeatureRedirect(feature.id)}
                        color="primary"
                      >
                        Upgrade
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Feature-gated content examples */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Feature-Gated Content Examples
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FeatureGateWrapper
              feature={FEATURES.ADVANCED_ANALYTICS}
              upgradePromptProps={{
                title: "Advanced Analytics Dashboard",
                description: "View detailed analytics and insights about your business performance.",
                suggestedPlan: "Professional"
              }}
            >
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📊 Advanced Analytics Dashboard
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This content is only visible to users with Advanced Analytics access.
                    Here you would see detailed charts, metrics, and insights.
                  </Typography>
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="success.dark">
                      ✅ You have access to this premium feature!
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </FeatureGateWrapper>
          </Grid>

          <Grid item xs={12} md={6}>
            <FeatureGateWrapper
              feature={FEATURES.TEAM_COLLABORATION}
              upgradePromptProps={{
                title: "Team Collaboration Tools",
                description: "Collaborate with your team members and share resources.",
                suggestedPlan: "Team"
              }}
            >
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    👥 Team Collaboration
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Team collaboration features including shared workspaces,
                    real-time editing, and team member management.
                  </Typography>
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="success.dark">
                      ✅ Team features are available!
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </FeatureGateWrapper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default FeatureGatingExample;