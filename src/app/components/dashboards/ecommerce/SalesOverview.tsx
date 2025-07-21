'use client'
import React from 'react';
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from '@mui/material/styles';
import { Stack, Typography, Box } from '@mui/material';
import { IconGridDots } from '@tabler/icons-react';
import DashboardCard from '../../shared/DashboardCard';
import SkeletonSalesOverviewCard from '../skeleton/SalesOverviewCard';

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

interface SalesOverviewCardProps {
  isLoading?: boolean;
  salesData?: SalesData[];
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
}

const SalesOverview = ({ 
  isLoading, 
  salesData = [], 
  totalRevenue = 0,
  totalExpenses = 0,
  netProfit = 0
}: SalesOverviewCardProps) => {
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const primarylight = theme.palette.primary.light;
  const textColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.8)' : '#2A3547';

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate financial metrics
  const revenue = totalRevenue || 0;
  const expenses = totalExpenses || 0;
  const profit = netProfit || (revenue - expenses);
  const totalAmount = revenue + expenses + Math.abs(profit);

  // Ensure we have valid data for the chart
  const revenuePercent = totalAmount > 0 ? (revenue / totalAmount) * 100 : 33.33;
  const expensePercent = totalAmount > 0 ? (expenses / totalAmount) * 100 : 33.33;
  const profitPercent = totalAmount > 0 ? (Math.abs(profit) / totalAmount) * 100 : 33.33;

  // chart
  const optionscolumnchart: any = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      toolbar: {
        show: false,
      },
      height: 275,
    },
    labels: ["Revenue", "Expenses", "Net Profit"],
    colors: [primary, secondary, profit >= 0 ? '#13DEB9' : '#FA896B'],
    plotOptions: {
      pie: {
        donut: {
          size: '89%',
          background: 'transparent',
          labels: {
            show: true,
            name: {
              show: true,
              offsetY: 7,
            },
            value: {
              show: true,
              formatter: (val: string) => `${Math.round(parseFloat(val))}%`,
            },
            total: {
              show: true,
              color: textColor,
              fontSize: '20px',
              fontWeight: '600',
              label: formatCurrency(revenue),
              formatter: () => `Total Revenue`,
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: false,
    },
    legend: {
      show: false,
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      fillSeriesColor: false,
      y: {
        formatter: (val: number, opts: any) => {
          // Safely access the label with optional chaining and fallbacks
          const label = opts?.w?.globals?.labels?.[opts?.seriesIndex];
          
          if (label === 'Revenue') return formatCurrency(revenue);
          if (label === 'Expenses') return formatCurrency(expenses);
          if (label === 'Net Profit') return formatCurrency(Math.abs(profit));
          
          // Fallback based on series index if label is not available
          const seriesIndex = opts?.seriesIndex ?? 0;
          if (seriesIndex === 0) return formatCurrency(revenue);
          if (seriesIndex === 1) return formatCurrency(expenses);
          if (seriesIndex === 2) return formatCurrency(Math.abs(profit));
          
          // Final fallback - format the raw value as currency
          return formatCurrency(val || 0);
        },
      },
    },
  };
  
  const seriescolumnchart = [revenuePercent, expensePercent, profitPercent];

  return (
    <>
      {
        isLoading ? (
          <SkeletonSalesOverviewCard />
        ) : (
          <DashboardCard title="Financial Overview" subtitle="Revenue vs Expenses">
            <>
              <Box mt={3} height="255px">
                <Chart
                  options={optionscolumnchart}
                  series={seriescolumnchart}
                  type="donut"
                  height="275px"
                  width={"100%"}
                />
              </Box>

              <Stack direction="row" spacing={2} justifyContent="space-between" mt={7}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    width={38}
                    height={38}
                    bgcolor="primary.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography
                      color="primary.main"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconGridDots width={22} />
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {formatCurrency(revenue)}
                    </Typography>
                    <Typography variant="subtitle2" color="textSecondary">
                      Total Revenue
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    width={38}
                    height={38}
                    bgcolor={profit >= 0 ? "success.light" : "error.light"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography
                      color={profit >= 0 ? "success.main" : "error.main"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconGridDots width={22} />
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {formatCurrency(Math.abs(profit))}
                    </Typography>
                    <Typography variant="subtitle2" color="textSecondary">
                      {profit >= 0 ? 'Net Profit' : 'Net Loss'}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </>
          </DashboardCard>
        )}
    </>

  );
};

export default SalesOverview;
