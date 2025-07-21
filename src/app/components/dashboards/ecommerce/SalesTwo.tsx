'use client'
import React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";

import DashboardCard from "../../shared/DashboardCard";

import { IconArrowUpRight, IconShoppingCart, IconArrowDownRight, IconPackage } from "@tabler/icons-react";
import SkeletonSalesTwoCard from "../skeleton/SalesTwoCard";

interface SalestwoCardProps {
  isLoading?: boolean;
  totalProducts?: number;
  growth?: number;
}

const SalesTwo = ({ isLoading, totalProducts = 0, growth = 0 }: SalestwoCardProps) => {
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;

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

  // Generate chart data based on product growth
  const generateChartData = () => {
    const baseValue = Math.max(30, Math.min(100, totalProducts / 10));
    const variance = growth / 5;
    
    return Array.from({ length: 6 }, (_, i) => {
      const trend = i * variance;
      return Math.max(20, Math.floor(baseValue + trend + (Math.random() * 20)));
    });
  };

  const chartData = generateChartData();

  // chart
  const optionscolumnchart: any = {
    chart: {
      type: "bar",
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: "#adb0bb",
      toolbar: {
        show: false,
      },
      height: 25,
      resize: true,
      barColor: "#fff",
      offsetX: -15,
      sparkline: {
        enabled: true,
      },
    },
    colors: [primary],
    grid: {
      show: false,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "100%",
        borderRadius: 3,
        distributed: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 5,
      colors: ["rgba(0,0,0,0.01)"],
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
    axisBorder: {
      show: false,
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      theme: theme.palette.mode === "dark" ? "dark" : "light",
      x: {
        show: false,
      },
      responsive: [
        {
          breakpoint: 767,
          options: {
            chart: { height: 60 },
            plotOptions: {
              bar: { columnWidth: "60%" },
            },
          },
        },
      ],
    },
  };
  const seriescolumnchart = [
    {
      name: "Product Growth",
      data: chartData,
    },
  ];

  return (
    <>
      {
        isLoading ? (
          <SkeletonSalesTwoCard />
        ) : (
          <DashboardCard>
            <>
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
                  <IconPackage width={22} />
                </Typography>
              </Box>

              <Box mt={3} mb={2} height="25px">
                <Chart
                  options={optionscolumnchart}
                  series={seriescolumnchart}
                  type="bar"
                  height="25px" width={"100%"}
                />
              </Box>

              <Typography variant="h4">
                {formatNumber(totalProducts)}
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
                Total Products {growth !== 0 ? `(${formatGrowth(growth)})` : ''}
              </Typography>
            </>
          </DashboardCard>
        )}
    </>

  );
};

export default SalesTwo;
