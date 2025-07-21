'use client'
import React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from "@mui/material/styles";
import { Stack, Typography, Avatar, Box } from "@mui/material";
import { IconArrowUpLeft, IconArrowDownLeft } from "@tabler/icons-react";

import DashboardCard from "../../shared/DashboardCard";
import SkeletonMonthlyEarningsCard from "../skeleton/MonthlyEarningsCard";

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

interface monthlyearningsCardProps {
  isLoading?: boolean;
  monthlyRevenue?: number;
  salesData?: SalesData[];
}

const MonthlyEarnings = ({ isLoading, monthlyRevenue = 0, salesData = [] }: monthlyearningsCardProps) => {
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primarylight = theme.palette.primary.light;
  const successlight = theme.palette.success.light;
  const errorlight = theme.palette.error.light;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate monthly growth from sales data
  const calculateMonthlyGrowth = () => {
    if (!salesData || salesData.length < 2) return 0;
    
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const currentMonthData = salesData.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth.getMonth() && 
             saleDate.getFullYear() === currentMonth.getFullYear();
    });
    
    const lastMonthData = salesData.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === lastMonth.getMonth() && 
             saleDate.getFullYear() === lastMonth.getFullYear();
    });
    
    const currentTotal = currentMonthData.reduce((sum, sale) => sum + sale.revenue, 0);
    const lastTotal = lastMonthData.reduce((sum, sale) => sum + sale.revenue, 0);
    
    if (lastTotal === 0) return currentTotal > 0 ? 100 : 0;
    return ((currentTotal - lastTotal) / lastTotal) * 100;
  };

  const monthlyGrowth = calculateMonthlyGrowth();
  
  // Generate chart data from recent sales
  const generateChartData = () => {
    if (!salesData || salesData.length === 0) {
      return [25, 66, 20, 40, 12, 58, 20]; // fallback data
    }
    
    // Get last 7 days of revenue data
    const last7Days = salesData.slice(-7).map(sale => sale.revenue / 100); // Scale down for chart
    
    // Pad with zeros if not enough data
    while (last7Days.length < 7) {
      last7Days.unshift(0);
    }
    
    return last7Days.slice(-7);
  };

  const chartData = generateChartData();

  // chart
  const optionscolumnchart: any = {
    chart: {
      type: "area",
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: "#adb0bb",
      toolbar: {
        show: false,
      },
      height: 70,
      sparkline: {
        enabled: true,
      },
      group: "sparklines",
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      colors: [primarylight],
      type: "solid",
      opacity: 0.05,
    },
    markers: {
      size: 0,
    },
    tooltip: {
      theme: theme.palette.mode === "dark" ? "dark" : "light",
      x: {
        show: false,
      },
    },
  };
  const seriescolumnchart = [
    {
      name: "Daily Revenue",
      color: primary,
      data: chartData,
    },
  ];

  return (
    <>
      {
        isLoading ? (
          <SkeletonMonthlyEarningsCard />
        ) : (
          <DashboardCard
            title="Monthly Earnings"
            action={
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: (theme) => theme.palette.primary.light,
                  width: 40,
                  height: 40,
                }}
              >
                <Avatar
                  src="/images/svgs/icon-master-card-2.svg"
                  alt="icon"
                  sx={{ width: 24, height: 24 }}
                />
              </Avatar>
            }
            footer={
              <Box height="70px">
                <Chart
                  options={optionscolumnchart}
                  series={seriescolumnchart}
                  type="area"
                  width={"100%"}
                  height="70px"
                />
              </Box>
            }
          >
            <>
              <Stack direction="row" spacing={1} alignItems="center" mb={3}>
                <Typography variant="h3" fontWeight="700">
                  {formatCurrency(monthlyRevenue)}
                </Typography>
                {monthlyGrowth !== 0 && (
                  <Stack direction="row" spacing={1} mt={1} mb={2} alignItems="center">
                    <Avatar sx={{ 
                      bgcolor: monthlyGrowth >= 0 ? successlight : errorlight, 
                      width: 20, 
                      height: 20 
                    }}>
                      {monthlyGrowth >= 0 ? (
                        <IconArrowUpLeft width={18} color="#13DEB9" />
                      ) : (
                        <IconArrowDownLeft width={18} color="#FA896B" />
                      )}
                    </Avatar>
                    <Typography variant="subtitle2" color="textSecondary">
                      {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </>
          </DashboardCard>
        )}
    </>
  );
};

export default MonthlyEarnings;
