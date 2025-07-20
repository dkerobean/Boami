'use client';

import React from 'react';
import { Box, Typography, Button, Grid, Paper } from '@mui/material';
import { useRouter } from 'next/navigation';
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Test Loading',
  },
];

const TestLoadingPage = () => {
  const router = useRouter();

  const testRoutes = [
    { path: '/apps/finance/dashboard', label: 'Finance Dashboard' },
    { path: '/apps/finance/income', label: 'Income' },
    { path: '/apps/finance/expenses', label: 'Expenses' },
    { path: '/apps/finance/sales', label: 'Sales' },
    { path: '/apps/ecommerce/shop', label: 'E-commerce Shop' },
    { path: '/apps/contacts', label: 'Contacts' },
    { path: '/apps/chats', label: 'Chats' },
  ];

  return (
    <PageContainer title="Test Loading Animations" description="Test page for loading animations">
      <Breadcrumb title="Test Loading Animations" items={BCrumb} />

      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Loading Animation Test
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }}>
            Click the buttons below to test loading animations between dashboard pages.
            You should see a linear loading bar at the top of the screen when navigating between dashboard routes.
          </Typography>

          <Grid container spacing={2}>
            {testRoutes.map((route) => (
              <Grid item xs={12} sm={6} md={4} key={route.path}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push(route.path)}
                  sx={{ py: 1.5 }}
                >
                  {route.label}
                </Button>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Expected Behavior:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
              <li>When clicking navigation buttons, you should see a linear loading bar at the top</li>
              <li>The loading bar should cover the full width of the screen</li>
              <li>Loading should be brief (150-300ms) for dashboard navigation</li>
              <li>No circular loading overlay should appear for dashboard routes</li>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
};

export default TestLoadingPage;