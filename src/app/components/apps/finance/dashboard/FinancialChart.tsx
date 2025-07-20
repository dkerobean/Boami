import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  useTheme,
  Skeleton
} from '@mui/material';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartDataPoint {
  name?: string;
  month?: string;
  value?: number;
  income?: number;
  expenses?: number;
  profit?: number;
  sales?: number;
  percentage?: number;
  [key: string]: any;
}

interface FinancialChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  type: 'line' | 'area' | 'bar' | 'pie';
  height?: number;
  loading?: boolean;
  colors?: string[];
  dataKeys?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
}

const FinancialChart: React.FC<FinancialChartProps> = ({
  title,
  subtitle,
  data,
  type,
  height = 300,
  loading = false,
  colors,
  dataKeys = ['value'],
  showLegend = true,
  showGrid = true
}) => {
  const theme = useTheme();

  // Default colors based on theme
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.secondary.main
  ];

  const chartColors = colors || defaultColors;

  // Format values for display
  const formatValue = (value: number | undefined | null) => {
    // Handle undefined, null, or NaN values
    if (value === undefined || value === null || isNaN(value)) {
      return '$0';
    }
    
    // Ensure value is a number
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return '$0';
    }
    
    if (Math.abs(numValue) >= 1000000) {
      return `$${(numValue / 1000000).toFixed(1)}M`;
    } else if (Math.abs(numValue) >= 1000) {
      return `$${(numValue / 1000).toFixed(1)}K`;
    } else {
      return `$${numValue.toFixed(0)}`;
    }
  };

  // Prepare chart options and series based on type
  const getChartConfig = () => {
    const baseOptions = {
      chart: {
        type: (type === 'line' ? 'line' : type === 'area' ? 'area' : type === 'bar' ? 'bar' : 'pie') as 'line' | 'area' | 'bar' | 'pie',
        height: height,
        toolbar: {
          show: false
        },
        background: 'transparent'
      },
      colors: chartColors,
      theme: {
        mode: theme.palette.mode as 'light' | 'dark'
      },
      legend: {
        show: showLegend,
        position: 'bottom' as const
      },
      grid: {
        show: showGrid,
        borderColor: theme.palette.divider
      },
      tooltip: {
        theme: theme.palette.mode,
        y: {
          formatter: (value: number) => formatValue(value)
        }
      }
    };

    if (type === 'pie') {
      return {
        options: {
          ...baseOptions,
          labels: data.map(item => item.name || ''),
          plotOptions: {
            pie: {
              donut: {
                size: '60%'
              }
            }
          }
        },
        series: data.map(item => item.value || 0)
      };
    }

    // For line, area, bar charts
    const categories = data.map(item => item.name || item.month || '');
    const series = dataKeys.map((key, index) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      data: data.map(item => item[key] || 0),
      color: chartColors[index % chartColors.length]
    }));

    return {
      options: {
        ...baseOptions,
        xaxis: {
          categories: categories,
          labels: {
            style: {
              colors: theme.palette.text.secondary
            }
          }
        },
        yaxis: {
          labels: {
            style: {
              colors: theme.palette.text.secondary
            },
            formatter: (value: number) => formatValue(value)
          }
        },
        stroke: {
          curve: 'smooth' as const,
          width: type === 'line' ? 3 : 0
        },
        fill: {
          type: type === 'area' ? 'gradient' : 'solid',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.3
          }
        }
      },
      series: series
    };
  };

  const renderChart = () => {
    if (loading) {
      return <Skeleton variant="rectangular" height={height} />;
    }

    if (!data || data.length === 0) {
      return (
        <Box
          sx={{
            height: height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary'
          }}
        >
          <Typography>No data available</Typography>
        </Box>
      );
    }

    const { options, series } = getChartConfig();

    return (
      <Chart
        options={options}
        series={series}
        type={type === 'pie' ? 'pie' : type === 'line' ? 'line' : type === 'area' ? 'area' : 'bar'}
        height={height}
      />
    );
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        }
        subheader={subtitle}
      />
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default FinancialChart;