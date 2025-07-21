import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import logoIcon from '/public/images/logos/logoIcon.svg';
import Image from 'next/image';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import EmailIcon from '@mui/icons-material/Email';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Handle newsletter signup
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Integrations', href: '/integrations' },
      { name: 'API Documentation', href: '/docs' },
      { name: 'Changelog', href: '/changelog' }
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Blog', href: '/blog' },
      { name: 'Press Kit', href: '/press' },
      { name: 'Contact', href: '/contact' }
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Community', href: '/community' },
      { name: 'System Status', href: '/status' },
      { name: 'Security', href: '/security' },
      { name: 'Training', href: '/training' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'GDPR', href: '/gdpr' },
      { name: 'Compliance', href: '/compliance' }
    ]
  };

  return (
    <Box component="footer" sx={{ backgroundColor: (theme) => theme.palette.grey[900], color: 'white', py: 6 }}>
      <Container maxWidth="lg">
        {/* Main Footer Content */}
        <Grid container spacing={4}>
          {/* Company Info & Newsletter */}
          <Grid item xs={12} md={4}>
            <Box mb={3}>
              <Image src={logoIcon} alt="BOAMI Logo" width={40} height={40} />
              <Typography variant="h6" fontWeight={700} mt={2} mb={2}>
                BOAMI
              </Typography>
              <Typography variant="body2" color="grey.300" mb={3}>
                Complete e-commerce management platform helping businesses streamline operations,
                increase efficiency, and drive growth through intelligent automation and insights.
              </Typography>
            </Box>

            {/* Newsletter Signup */}
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Stay Updated
              </Typography>
              <Typography variant="body2" color="grey.300" mb={2}>
                Get the latest features and e-commerce insights delivered to your inbox.
              </Typography>
              <Box component="form" onSubmit={handleNewsletterSubmit}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                      },
                      '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.7)' }
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubscribed}
                  >
                    {isSubscribed ? '✓' : 'Subscribe'}
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Grid>

          {/* Product Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Product
            </Typography>
            <Stack spacing={1}>
              {footerLinks.product.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  color="grey.300"
                  underline="none"
                  sx={{ '&:hover': { color: 'primary.main' } }}
                >
                  {link.name}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Company Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Company
            </Typography>
            <Stack spacing={1}>
              {footerLinks.company.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  color="grey.300"
                  underline="none"
                  sx={{ '&:hover': { color: 'primary.main' } }}
                >
                  {link.name}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Support Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Support
            </Typography>
            <Stack spacing={1}>
              {footerLinks.support.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  color="grey.300"
                  underline="none"
                  sx={{ '&:hover': { color: 'primary.main' } }}
                >
                  {link.name}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Legal Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Legal
            </Typography>
            <Stack spacing={1}>
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  color="grey.300"
                  underline="none"
                  sx={{ '&:hover': { color: 'primary.main' } }}
                >
                  {link.name}
                </Link>
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Bottom Footer */}
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="grey.400">
              © 2024 BOAMI. All rights reserved. | Built with ❤️ for e-commerce businesses worldwide.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', md: 'flex-end' }} mt={{ xs: 2, md: 0 }}>
              <IconButton
                href="https://facebook.com/boami"
                target="_blank"
                sx={{ color: 'grey.400', '&:hover': { color: 'primary.main' } }}
              >
                <FacebookIcon />
              </IconButton>
              <IconButton
                href="https://twitter.com/boami"
                target="_blank"
                sx={{ color: 'grey.400', '&:hover': { color: 'primary.main' } }}
              >
                <TwitterIcon />
              </IconButton>
              <IconButton
                href="https://linkedin.com/company/boami"
                target="_blank"
                sx={{ color: 'grey.400', '&:hover': { color: 'primary.main' } }}
              >
                <LinkedInIcon />
              </IconButton>
              <IconButton
                href="https://instagram.com/boami"
                target="_blank"
                sx={{ color: 'grey.400', '&:hover': { color: 'primary.main' } }}
              >
                <InstagramIcon />
              </IconButton>
              <IconButton
                href="mailto:hello@boami.com"
                sx={{ color: 'grey.400', '&:hover': { color: 'primary.main' } }}
              >
                <EmailIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer;
