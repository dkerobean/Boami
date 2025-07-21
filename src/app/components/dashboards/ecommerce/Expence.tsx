import React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from "@mui/material/styles";
import { Typography, Box, Chip } from "@mui/material";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Props } from "react-apexcharts";

import DashboardCard from "../../shared/DashboardCard";
import SkeletonExpenceCard from "../skeleton/ExpanceCard";

interface ExpanceCardProps {
  isLoading?: boolean;
  totalExpenses?: number;
  growth?: number;
}

const Expence = ({ isLoading, totalExpenses = 0, growth = 0 }: ExpanceCardProps) => {
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const error = theme.palette.error.main;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = () => {
    // For expenses, negative growth is good (less expenses)
    if (growth < 0) return 'success';
    if (growth > 0) return 'error';
    return 'default';
  };

  // Generate realistic expense breakdown
  const generateExpenseBreakdown = () => {
    if (totalExpenses === 0) {
      return [0, 0, 0];
    }
    
    // Typical ecommerce expense breakdown
    const operationalExpenses = totalExpenses * 0.6; // 60% operational
    const marketingExpenses = totalExpenses * 0.25;  // 25% marketing
    const adminExpenses = totalExpenses * 0.15;      // 15% administrative
    
    return [operationalExpenses, marketingExpenses, adminExpenses];
  };

  const expenseBreakdown = generateExpenseBreakdown();

  // chart
  const optionsexpencechart: any = {
    chart: {
      type: "donut",
      fontFamily: "'Plus Jakarta Sans', sans-serif;",

      toolbar: {
        show: false,
      },
      height: 120,
    },
    labels: ["Operations", "Marketing", "Administrative"],
    colors: [primary, error, secondary],
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          background: "transparent",
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
      theme: theme.palette.mode === "dark" ? "dark" : "light",
      fillSeriesColor: false,
    },
  };
  const seriesexpencechart = expenseBreakdown;

  return (
    <>
      {isLoading ? (
        <SkeletonExpenceCard />
      ) : (
        <DashboardCard>
          <>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h4">
                {formatCurrency(totalExpenses)}
              </Typography>
              {growth !== 0 && (
                <Chip
                  icon={growth < 0 ? <IconTrendingDown size={16} /> : <IconTrendingUp size={16} />}
                  label={formatGrowth(growth)}
                  color={getGrowthColor() as any}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            <Typography variant="subtitle2" color="textSecondary" mb={2}>
              Total Expenses {growth !== 0 ? `(${formatGrowth(growth)} vs last month)` : ''}
            </Typography>
            <Box height="100px">
              <Chart
                options={optionsexpencechart}
                series={seriesexpencechart}
                type="donut"
                height="120px"
                width={"100%"}
              />
            </Box>
          </>
        </DashboardCard>
      )}
    </>
  );
};

export default Expence;
