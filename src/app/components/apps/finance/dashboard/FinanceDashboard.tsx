import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar
} from '@mui/material';
import {
  IconCash,
  IconReceipt,
  IconTrendingUp,
  IconShoppingCart,
  IconCalendar,
  IconAlertTriangle,
  IconUsers,
  IconRepeat,
  IconArrowRight
} from '@tabler/icons-react';
import { FinancialCalculator } from '@/lib/services/FinancialCalculator';

import FinancialSummaryCard from './FinancialSummaryCard';
import FinancialChart from './FinancialChart';

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalSales: number;
    averageSale: number;
  };
  previousSummary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalSales: number;
  };
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
    profit: number;
    sales: number;
  }>;
  categoryBreakdown: {
    income: Array<{ name: string; value: number; percentage: number }>;
    expenses: Array<{ name: string; value: number; percentage: number }>;
  };
  recentTransactions: Array<{
    id: string;
    type: 'income' | 'expense' | 'sale';
    description: string;
    amount: number;
    date: string;
    category?: string;
  }>;
  upcomingPayments: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate: string;
    type: 'income' | 'expense';
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    currentStock: number;
    threshold: number;
  }>;
}

// Real API function to fetch dashboard data from MongoDB
const fetchDashboardData = async (dateRange: string): Promise<DashboardData> => {
  const response = await fetch(`/api/finance/dashboard?dateRange=${dateRange}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to fetch dashboard data');
  }
  
  return result.data;
};

const FinanceDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardData(dateRange);
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <IconCash size={20} color="green" />;
      case 'expense':
        return <IconReceipt size={20} color="red" />;
      case 'sale':
        return <IconShoppingCart size={20} color="blue" />;
      default:
        return <IconCash size={20} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'success.main';
      case 'expense':
        return 'error.main';
      case 'sale':
        return 'primary.main';
      default:
        return 'text.primary';
    }
  };

  if (error) {
    return (
      <>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadDashboardData}>
          Retry
        </Button>
      </>
    );
  }

  return (
    <>
      {/* Header Controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Financial Overview
        </Typography>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Date Range</InputLabel>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            label="Date Range"
          >
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="quarter">This Quarter</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FinancialSummaryCard
            title="Total Income"
            amount={dashboardData?.summary.totalIncome || 0}
            previousAmount={dashboardData?.previousSummary.totalIncome}
            icon={<IconCash size={24} />}
            color="success"
            subtitle="Revenue generated"
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FinancialSummaryCard
            title="Total Expenses"
            amount={dashboardData?.summary.totalExpenses || 0}
            previousAmount={dashboardData?.previousSummary.totalExpenses}
            icon={<IconReceipt size={24} />}
            color="error"
            subtitle="Money spent"
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FinancialSummaryCard
            title="Net Profit"
            amount={dashboardData?.summary.netProfit || 0}
            previousAmount={dashboardData?.previousSummary.netProfit}
            icon={<IconTrendingUp size={24} />}
            color="primary"
            subtitle={`${dashboardData?.summary.profitMargin || 0}% margin`}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FinancialSummaryCard
            title="Total Sales"
            amount={dashboardData?.summary.totalSales || 0}
            previousAmount={dashboardData?.previousSummary.totalSales}
            icon={<IconShoppingCart size={24} />}
            color="info"
            subtitle={`Avg: ${formatCurrency(dashboardData?.summary.averageSale || 0)}`}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <FinancialChart
            title="Financial Trend"
            subtitle="Monthly income, expenses, and profit"
            data={dashboardData?.monthlyData || []}
            type="line"
            height={350}
            dataKeys={['income', 'expenses', 'profit']}
            loading={loading}
            colors={['#4caf50', '#f44336', '#2196f3']}
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <FinancialChart
            title="Expense Breakdown"
            subtitle="Current period expenses by category"
            data={dashboardData?.categoryBreakdown.expenses || []}
            type="pie"
            height={350}
            loading={loading}
            showLegend={false}
          />
        </Grid>
      </Grid>

      {/* Bottom Row */}
      <Grid container spacing={3}>
        {/* Recent Transactions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Recent Transactions</Typography>
                <Button size="small" endIcon={<IconArrowRight size={16} />}>
                  View All
                </Button>
              </Stack>

              {loading ? (
                <CircularProgress />
              ) : (
                <List dense>
                  {dashboardData?.recentTransactions.slice(0, 5).map((transaction) => (
                    <ListItem key={transaction.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        {getTransactionIcon(transaction.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={transaction.description}
                        secondary={`${transaction.category} • ${formatDate(transaction.date)}`}
                      />
                      <Typography
                        variant="body2"
                        color={getTransactionColor(transaction.type)}
                        sx={{ fontWeight: 600 }}
                      >
                        {transaction.type === 'expense' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts and Notifications */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Alerts & Notifications
              </Typography>

              {loading ? (
                <CircularProgress />
              ) : (
                <Stack spacing={2}>
                  {/* Upcoming Payments */}
                  {(dashboardData?.upcomingPayments?.length ?? 0) > 0 && (
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <IconCalendar size={16} />
                        <Typography variant="subtitle2">Upcoming Payments</Typography>
                      </Stack>
                      {dashboardData?.upcomingPayments?.slice(0, 2).map((payment) => (
                        <Box key={payment.id} sx={{ ml: 3, mb: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">
                              {payment.description}
                            </Typography>
                            <Chip
                              label={formatCurrency(payment.amount)}
                              size="small"
                              color={payment.type === 'income' ? 'success' : 'error'}
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Due: {formatDate(payment.dueDate)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Divider />

                  {/* Low Stock Alerts */}
                  {(dashboardData?.lowStockProducts?.length ?? 0) > 0 && (
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <IconAlertTriangle size={16} color="orange" />
                        <Typography variant="subtitle2" color="warning.main">
                          Low Stock Alert
                        </Typography>
                      </Stack>
                      {dashboardData?.lowStockProducts?.slice(0, 3).map((product) => (
                        <Box key={product.id} sx={{ ml: 3, mb: 1 }}>
                          <Typography variant="body2">
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="warning.main">
                            {product.currentStock} left (threshold: {product.threshold})
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default FinanceDashboard;