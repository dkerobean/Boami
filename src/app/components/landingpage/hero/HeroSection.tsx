import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { motion } from 'framer-motion';
import { landingPageContent } from '@/data/landing-page-content';
import CTAButton from '@/app/components/shared/CTAButton';
import ScrollingImageAnimation from '@/app/components/shared/ScrollingImageAnimation';
import { IconShoppingCart, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useABTestVariant } from '@/app/components/landingpage/testing/ABTestProvider';

const HeroSection: React.FC = () => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const { hero } = landingPageContent;

  // A/B test for CTA button text
  const { variant: ctaVariant, trackConversion } = useABTestVariant('hero_cta_text');
  const ctaText = ctaVariant === 'variant_a' ? 'Get Started Free' : hero.ctaPrimary;

  const handleCTAClick = () => {
    trackConversion('cta_click');
  };

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: {
          xs: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(255, 255, 255, 1) 100%)',
          lg: 'linear-gradient(135deg, rgba(25, 118, 210, 0.02) 0%, rgba(255, 255, 255, 1) 50%)'
        },
      }}
    >
      {/* Full-screen Animation Background - Desktop Only */}
      {lgUp && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '55%',
            height: '100%',
            zIndex: 0,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 30%, transparent 100%)',
              zIndex: 1,
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', width: '100%' }}
          >
            <ScrollingImageAnimation
              config={{
                ...hero.backgroundAnimation.config,
                speed: 25, // Slower for better visual appeal
              }}
            />
          </motion.div>
        </Box>
      )}

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 2 }}>
        <Grid container spacing={0} alignItems="center" sx={{ minHeight: '100vh' }}>
          {/* Content Section */}
          <Grid item xs={12} lg={6}>
            <Box
              sx={{
                textAlign: { xs: 'center', lg: 'left' },
                py: { xs: 8, lg: 0 },
                px: { xs: 2, lg: 0 },
                maxWidth: { xs: '100%', lg: '90%' }
              }}
            >
              {/* Overline */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    justifyContent: { xs: 'center', lg: 'flex-start' },
                    mb: 3,
                    color: 'primary.main',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <IconShoppingCart size={20} />
                  <Typography variant="overline" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    Transform your e-commerce business
                  </Typography>
                </Stack>
              </motion.div>

              {/* Main Headline */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem', lg: '4.5rem' },
                    fontWeight: 800,
                    lineHeight: { xs: 1.2, lg: 1.1 },
                    mb: 3,
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Complete E-commerce{' '}
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #4caf50 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      display: 'block',
                      mt: { xs: 1, lg: 0 }
                    }}
                  >
                    Management Platform
                  </Box>
                </Typography>
              </motion.div>

              {/* Subheadline */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: { xs: '1.1rem', sm: '1.25rem', lg: '1.4rem' },
                    fontWeight: 400,
                    lineHeight: 1.6,
                    color: 'text.secondary',
                    mb: 4,
                    maxWidth: { xs: '100%', lg: '85%' }
                  }}
                >
                  {hero.subheadline}
                </Typography>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{
                    justifyContent: { xs: 'center', lg: 'flex-start' },
                    alignItems: 'center',
                    mb: 6
                  }}
                >
                  <Button
                    href="/auth/auth1/register"
                    variant="contained"
                    size="large"
                    onClick={handleCTAClick}
                    sx={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      textTransform: 'none',
                      boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                      '&:hover': {
                        boxShadow: '0 12px 40px rgba(25, 118, 210, 0.4)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {ctaText}
                  </Button>

                  <Button
                    href="#features"
                    variant="outlined"
                    size="large"
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.querySelector('#features');
                      if (element) {
                        element.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }
                    }}
                    sx={{
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      textTransform: 'none',
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {hero.ctaSecondary}
                  </Button>
                </Stack>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <Box sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      mb: 2,
                      fontWeight: 500
                    }}
                  >
                    Trusted by 10,000+ businesses worldwide
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      justifyContent: { xs: 'center', lg: 'flex-start' },
                      flexWrap: 'wrap'
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <IconStarFilled key={star} size={20} style={{ color: '#ffc107' }} />
                    ))}
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        ml: 1,
                        fontWeight: 500
                      }}
                    >
                      4.9/5 from 2,500+ reviews
                    </Typography>
                  </Stack>
                </Box>
              </motion.div>
            </Box>
          </Grid>

          {/* Mobile Animation Section */}
          {!lgUp && mdUp && (
            <Grid item md={12}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <Box
                  sx={{
                    mt: 4,
                    mx: 'auto',
                    maxWidth: '600px',
                    height: '400px'
                  }}
                >
                  <ScrollingImageAnimation
                    config={hero.backgroundAnimation.config}
                  />
                </Box>
              </motion.div>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Decorative Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '-10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, transparent 70%)',
          filter: 'blur(100px)',
          zIndex: -1,
          display: { xs: 'none', lg: 'block' },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: -1,
          display: { xs: 'none', lg: 'block' },
        }}
      />
    </Box>
  );
};

export default HeroSection;