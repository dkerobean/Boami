import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import { landingPageContent } from '@/data/landing-page-content';

const SocialProofSection: React.FC = () => {
  const { testimonials } = landingPageContent;

  return (
    <Box py={8} sx={{ backgroundColor: (theme) => theme.palette.grey[50] }}>
      <Container maxWidth="lg">
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" component="h2" gutterBottom fontWeight={700}>
            Trusted by Growing E-commerce Businesses
          </Typography>
          <Typography variant="h5" color="text.secondary" maxWidth="600px" mx="auto">
            See how BOAMI is helping businesses like yours achieve remarkable results
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {testimonials.map((testimonial) => (
            <Grid item xs={12} md={4} key={testimonial.id}>
              <Card sx={{ height: '100%', p: 2 }}>
                <CardContent>
                  <Typography variant="body1" paragraph sx={{ fontStyle: 'italic' }}>
                    "{testimonial.quote}"
                  </Typography>

                  <Box display="flex" alignItems="center" gap={2} mt={3}>
                    <Avatar
                      src={testimonial.author.avatar}
                      alt={testimonial.author.name}
                      sx={{ width: 48, height: 48 }}
                    />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {testimonial.author.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.author.title}, {testimonial.author.company}
                      </Typography>
                    </Box>
                  </Box>

                  {testimonial.metrics && (
                    <Box mt={2} p={2} sx={{ backgroundColor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="primary.dark">
                        {testimonial.metrics.improvement}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        in {testimonial.metrics.timeframe}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Success Metrics */}
        <Box mt={8} textAlign="center">
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" component="div" fontWeight={700} color="primary">
                10,000+
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Businesses Trust BOAMI
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" component="div" fontWeight={700} color="primary">
                $50M+
              </Typography>
              <Typography variant="h6" color="text.secondary">
                In Sales Processed Monthly
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" component="div" fontWeight={700} color="primary">
                99.9%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Platform Uptime
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default SocialProofSection;