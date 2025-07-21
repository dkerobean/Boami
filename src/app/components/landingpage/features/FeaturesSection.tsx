import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Image from 'next/image';
import { landingPageContent } from '@/data/landing-page-content';
import { SectionHeadline, BodyLarge, FeatureTitle } from '@/app/components/shared/Typography';
import { FadeIn, Stagger } from '@/app/components/shared/ScrollAnimations';
import ResponsiveCard from '@/app/components/shared/ResponsiveCard';

const FeaturesSection: React.FC = () => {
  const { features } = landingPageContent;

  return (
    <Box component="section" py={10} id="features">
      <Container maxWidth="lg">
        {/* Section Header */}
        <FadeIn direction="up">
          <Box textAlign="center" mb={8}>
            <SectionHeadline component="h2" gutterBottom>
              Everything You Need to Manage Your E-commerce Business
            </SectionHeadline>
            <BodyLarge sx={{ maxWidth: '700px', mx: 'auto' }}>
              From inventory to insights, BOAMI provides all the tools you need in one powerful platform
            </BodyLarge>
          </Box>
        </FadeIn>

        {/* Features Grid */}
        <Stagger staggerDelay={0.2}>
          {features.map((feature, index) => (
            <Box key={feature.id} mb={12}>
              <Grid
                container
                spacing={6}
                alignItems="center"
                direction={index % 2 === 0 ? 'row' : 'row-reverse'}
              >
                {/* Content Side */}
                <Grid item xs={12} md={6}>
                  <Box>
                    {/* Feature Icon/Emoji */}
                    <Box
                      sx={{
                        fontSize: '3rem',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <span>{feature.icon}</span>
                      <Box
                        sx={{
                          width: 4,
                          height: 40,
                          backgroundColor: 'primary.main',
                          borderRadius: 2
                        }}
                      />
                    </Box>

                    {/* Feature Title */}
                    <FeatureTitle component="h3" gutterBottom>
                      {feature.title}
                    </FeatureTitle>

                    {/* Feature Description */}
                    <BodyLarge sx={{ mb: 3 }}>
                      {feature.description}
                    </BodyLarge>

                    {/* Benefits List */}
                    <List dense sx={{ mb: 3 }}>
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <ListItem key={benefitIndex} sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon
                              color="success"
                              fontSize="small"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={benefit}
                            primaryTypographyProps={{
                              variant: 'body1',
                              sx: { fontSize: '1rem' }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* Feature Metrics (if available) */}
                    {feature.metrics && (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 3,
                          mt: 3,
                          flexWrap: 'wrap'
                        }}
                      >
                        {feature.metrics.map((metric, metricIndex) => (
                          <Box key={metricIndex} textAlign="center">
                            <Typography
                              variant="h4"
                              component="div"
                              fontWeight={700}
                              color="primary"
                            >
                              {metric.value}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              {metric.label}
                            </Typography>
                            {metric.improvement && (
                              <Typography
                                variant="caption"
                                color="success.main"
                                fontWeight={600}
                              >
                                {metric.improvement}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* Image/Screenshot Side */}
                <Grid item xs={12} md={6}>
                  <ResponsiveCard elevated>
                    <Box
                      sx={{
                        position: 'relative',
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: 'grey.50',
                        minHeight: 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {feature.screenshot ? (
                        <Image
                          src={feature.screenshot}
                          alt={`${feature.title} interface`}
                          fill
                          style={{
                            objectFit: 'cover',
                            borderRadius: '8px',
                          }}
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        // Placeholder when screenshot is not available
                        <Box
                          sx={{
                            textAlign: 'center',
                            p: 4,
                            color: 'text.secondary'
                          }}
                        >
                          <Box sx={{ fontSize: '4rem', mb: 2 }}>
                            {feature.icon}
                          </Box>
                          <Typography variant="h6" gutterBottom>
                            {feature.title}
                          </Typography>
                          <Typography variant="body2">
                            Interface Preview Coming Soon
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </ResponsiveCard>
                </Grid>
              </Grid>
            </Box>
          ))}
        </Stagger>

        {/* Call to Action */}
        <FadeIn direction="up" delay={0.5}>
          <Box textAlign="center" mt={8}>
            <Typography variant="h4" component="h3" gutterBottom fontWeight={600}>
              Ready to Transform Your E-commerce Business?
            </Typography>
            <BodyLarge sx={{ mb: 4, maxWidth: '600px', mx: 'auto' }}>
              Join thousands of businesses already using BOAMI to streamline their operations and boost growth.
            </BodyLarge>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center'
              }}
            >
              <Box
                component="a"
                href="/auth/auth1/register"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 4,
                  py: 1.5,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  borderRadius: 2,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Start Free Trial
              </Box>
              <Box
                component="a"
                href="/demo"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 4,
                  py: 1.5,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  borderRadius: 2,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Request Demo
              </Box>
            </Box>
          </Box>
        </FadeIn>
      </Container>
    </Box>
  );
};

export default FeaturesSection;