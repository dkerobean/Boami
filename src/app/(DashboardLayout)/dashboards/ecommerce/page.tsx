"use client"
import React from 'react';
import { Box, Grid, Alert, CircularProgress, Typography } from '@mui/material';
import PageContainer from '@/app/components/container/PageContainer';

import WeeklyStats from '@/app/components/dashboards/modern/WeeklyStats';
import YearlySales from '@/app/components/dashboards/ecommerce/YearlySales';
import PaymentGateways from '@/app/components/dashboards/ecommerce/PaymentGateways';
import WelcomeCard from '@/app/components/dashboards/ecommerce/WelcomeCard';
import Expence from '@/app/components/dashboards/ecommerce/Expence';
import Growth from '@/app/components/dashboards/ecommerce/Growth';
import RevenueUpdates from '@/app/components/dashboards/ecommerce/RevenueUpdates';
import SalesOverview from '@/app/components/dashboards/ecommerce/SalesOverview';
import SalesTwo from '@/app/components/dashboards/ecommerce/SalesTwo';
import Sales from '@/app/components/dashboards/ecommerce/Sales';
import MonthlyEarnings from '@/app/components/dashboards/ecommerce/MonthlyEarnings';
import ProductPerformances from '@/app/components/dashboards/ecommerce/ProductPerformances';
import RecentTransactions from '@/app/components/dashboards/ecommerce/RecentTransactions';

import { useEcommerceDashboard } from '@/hooks/useEcommerceDashboard';

const Ecommerce = () => {
  const {
    stats,
    salesData,
    products,
    transactions,
    paymentStats,
    isLoading,
    error,
    refresh
  } = useEcommerceDashboard();

  // Show loading state
  if (isLoading) {
    return (
      <PageContainer title="eCommerce Dashboard" description="Loading your eCommerce dashboard...">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          flexDirection="column"
          gap={2}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" color="textSecondary">
            Loading Dashboard Data...
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  // Show error state
  if (error) {
    return (
      <PageContainer title="eCommerce Dashboard" description="Error loading dashboard">
        <Box mt={3}>
          <Alert
            severity="error"
            action={
              <button onClick={refresh} style={{ marginLeft: '8px' }}>
                Retry
              </button>
            }
          >
            {error}
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="eCommerce Dashboard" description="Your comprehensive eCommerce management platform">
      <Box mt={3}>
        <Grid container spacing={3}>
          {/* Welcome Card */}
          <Grid item xs={12} lg={8}>
            <WelcomeCard stats={stats} />
          </Grid>

          {/* Key Metrics */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Expence
                  isLoading={false}
                  totalExpenses={stats?.totalExpenses || 0}
                  growth={stats?.revenueGrowth || 0}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Sales
                  isLoading={false}
                  totalSales={stats?.totalOrders || 0}
                  growth={stats?.ordersGrowth || 0}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Revenue Updates */}
          <Grid item xs={12} sm={6} lg={4}>
            <RevenueUpdates
              isLoading={false}
              salesData={salesData}
              totalRevenue={stats?.totalRevenue || 0}
            />
          </Grid>

          {/* Sales Overview */}
          <Grid item xs={12} sm={6} lg={4}>
            <SalesOverview
              isLoading={false}
              salesData={salesData}
              totalRevenue={stats?.totalRevenue || 0}
              totalExpenses={stats?.totalExpenses || 0}
              netProfit={stats?.netProfit || 0}
            />
          </Grid>

          {/* Additional Metrics */}
          <Grid item xs={12} sm={6} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <SalesTwo
                  isLoading={false}
                  totalProducts={stats?.totalProducts || 0}
                  growth={stats?.productsGrowth || 0}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Growth
                  isLoading={false}
                  totalCustomers={stats?.totalCustomers || 0}
                  growth={stats?.customersGrowth || 0}
                />
              </Grid>
              <Grid item xs={12}>
                <MonthlyEarnings
                  isLoading={false}
                  monthlyRevenue={stats?.totalRevenue || 0}
                  salesData={salesData}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Weekly Stats */}
          <Grid item xs={12} sm={6} lg={4}>
            <WeeklyStats
              isLoading={false}
              salesData={salesData}
            />
          </Grid>

          {/* Yearly Sales */}
          <Grid item xs={12} lg={4}>
            <YearlySales
              isLoading={false}
              salesData={salesData}
              totalRevenue={stats?.totalRevenue || 0}
            />
          </Grid>

          {/* Payment Gateways */}
          <Grid item xs={12} lg={4}>
            <PaymentGateways paymentStats={paymentStats} />
          </Grid>

          {/* Recent Transactions */}
          <Grid item xs={12} lg={4}>
            <RecentTransactions transactions={transactions} />
          </Grid>

          {/* Product Performance */}
          <Grid item xs={12} lg={8}>
            <ProductPerformances products={products} />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Ecommerce;
