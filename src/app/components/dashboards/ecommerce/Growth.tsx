import React from 'react';
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Avatar } from '@mui/material';

import DashboardCard from '../../shared/DashboardCard';
import { IconArrowUpRight, IconArrowDownRight, IconUsers } from '@tabler/icons-react';
import SkeletonGrowthCard from '../skeleton/GrowthCard';


interface GrowthCardProps {
  isLoading?: boolean;
  totalCustomers?: number;
  growth?: number;
}

const Growth = ({ isLoading, totalCustomers = 0, growth = 0 }: GrowthCardProps) => {
  // chart color
  const theme = useTheme();
  const secondary = theme.palette.secondary.main;
  const success = theme.palette.success.main;
  const error = theme.palette.error.main;

  // Helper functions
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatGrowth = (growth: number) => {
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  // Generate chart data based on customer growth
  const generateChartData = () => {
    const baseValue = Math.max(10, Math.min(80, totalCustomers / 100));
    const variance = growth / 10;
    
    return Array.from({ length: 18 }, (_, i) => {
      const trend = (i / 17) * variance; // Gradual trend over time
      const noise = (Math.random() - 0.5) * 10; // Add some randomness
      return Math.max(0, Math.floor(baseValue + trend + noise));
    });
  };

  const chartData = generateChartData();

  // chart
  const optionscolumnchart: any = {
    chart: {
      type: 'area',
      height: 25,
      fontFamily: `inherit`,
      foreColor: '#a1aab2',
      toolbar: {
        show: false,
      },
      sparkline: {
        enabled: true,
      },
      group: 'sparklines',
    },
    colors: [secondary],
    stroke: {
      curve: 'straight',
      width: 2,
    },
    fill: {
      type: 'solid',
      opacity: 0.05,
    },
    markers: {
      size: 0,
    },
    tooltip: {
      theme: 'dark',
      x: {
        show: false,
      },
    },
  };
  const seriescolumnchart = [
    {
      name: 'Customer Growth Trend',
      data: chartData,
    },
  ];

  return (
    <>
      {
        isLoading ? (
          <SkeletonGrowthCard />
        ) : (
          <DashboardCard>
            <>
              <Box
                width={38}
                height={38}
                bgcolor="secondary.light"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IconUsers color={secondary} width={22} height={22} />
              </Box>

              <Box mt={3} mb={2} height="25px">
                <Chart options={optionscolumnchart} series={seriescolumnchart} type="area" height="25px" width={"100%"} />
              </Box>

              <Typography variant="h4">
                {formatGrowth(growth)}
                {growth !== 0 && (
                  <span>
                    {growth >= 0 ? (
                      <IconArrowUpRight width={18} color="#39B69A" />
                    ) : (
                      <IconArrowDownRight width={18} color="#FA896B" />
                    )}
                  </span>
                )}
              </Typography>
              <Typography variant="subtitle2" color="textSecondary">
                Customer Growth ({formatNumber(totalCustomers)} total)
              </Typography>
            </>
          </DashboardCard>
        )}
    </>

  );
};

export default Growth;
