'use client';

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link
} from '@mui/material';
import { IconHome, IconPackage } from '@tabler/icons-react';
import { PricingPage } from '@/components/subscription';

const SubscriptionPlansPage: React.FC = () => {
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
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconPackage size={18} />
            Subscription Plans
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Pricing Component */}
      <div className="w-full">
        <PricingPage
          showTitle={true}
          showDescription={true}
          highlightPopular={true}
          className="max-w-none"
        />
      </div>
    </Container>
  );
};

export default SubscriptionPlansPage;