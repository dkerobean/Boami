import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { landingPageContent } from '@/data/landing-page-content';

const PricingSection: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { pricing } = landingPageContent;

  return (
    <Box py={8} id="pricing">
      <Container maxWidth="lg">
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" component="h2" gutterBottom fontWeight={700}>
            {pricing.title}
          </Typography>
          <Typography variant="h5" color="text.secondary" maxWidth="600px" mx="auto" mb={4}>
            {pricing.subtitle}
          </Typography>

          {/* Billing Toggle */}
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={4}>
            <Typography variant="body1">Monthly</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isAnnual}
                  onChange={(e) => setIsAnnual(e.target.checked)}
                  color="primary"
                />
              }
              label=""
            />
            <Typography variant="body1">Annual</Typography>
            {isAnnual && (
              <Chip
                label={pricing.billingToggle.savings}
                color="success"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {pricing.plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  border: plan.isPopular ? '2px solid' : '1px solid',
                  borderColor: plan.isPopular ? 'primary.main' : 'divider',
                  transform: plan.isPopular ? 'scale(1.05)' : 'none',
                  zIndex: plan.isPopular ? 1 : 0
                }}
              >
                {plan.isPopular && (
                  <Chip
                    label="Most Popular"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}
                  />
                )}

                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h4" component="h3" gutterBottom fontWeight={700}>
                    {plan.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {plan.description}
                  </Typography>

                  <Box mb={3}>
                    <Typography variant="h3" component="div" fontWeight={700} color="primary">
                      ${isAnnual ? plan.price.annual : plan.price.monthly}
                      <Typography component="span" variant="h6" color="text.secondary">
                        /{isAnnual ? 'year' : 'month'}
                      </Typography>
                    </Typography>
                    {isAnnual && (
                      <Typography variant="body2" color="text.secondary">
                        ${Math.round(plan.price.annual / 12)}/month billed annually
                      </Typography>
                    )}
                  </Box>

                  <Button
                    variant={plan.cta.variant as any}
                    color={plan.cta.color as any}
                    size="large"
                    fullWidth
                    href={plan.cta.href}
                    sx={{ mb: 3, py: 1.5 }}
                  >
                    {plan.cta.text}
                  </Button>

                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {feature.included ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <CancelIcon color="disabled" fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={feature.name}
                          sx={{
                            color: feature.included ? 'text.primary' : 'text.disabled',
                            '& .MuiListItemText-primary': {
                              fontSize: '0.875rem'
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Trust Signals */}
        <Box mt={6} textAlign="center">
          <Typography variant="body2" color="text.secondary" mb={2}>
            ✓ 14-day free trial • ✓ No setup fees • ✓ Cancel anytime • ✓ 24/7 support
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join thousands of businesses already growing with BOAMI
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default PricingSection;