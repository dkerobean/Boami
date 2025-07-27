import React from 'react';
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from '@mui/material/styles';
import DashboardCard from '../../shared/DashboardCard';
import CustomSelect from '../../forms/theme-elements/CustomSelect';
import { FeatureGateWrapper } from '@/components/subscription';
import { FEATURES } from '@/hooks/useFeatureAccess';
import {
  MenuItem,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  TableContainer,
  Stack,
} from '@mui/material';

interface ProductPerformance {
  _id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  sales: number;
  revenue: number;
  image: string;
}

interface ProductPerformancesProps {
  products?: ProductPerformance[];
}

const ProductPerformances = ({ products = [] }: ProductPerformancesProps) => {
  // for select
  const [month, setMonth] = React.useState('1');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(event.target.value);
  };

  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const grey = theme.palette.grey[300];
  const primarylight = theme.palette.primary.light;
  const greylight = theme.palette.grey[100];

  // Base chart configuration for sparklines
  const optionsrow1chart: any = {
    chart: {
      type: 'area',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#adb0bb',
      toolbar: {
        show: false,
      },
      height: 35,
      width: 100,
      sparkline: {
        enabled: true,
      },
      group: 'sparklines',
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    fill: {
      colors: [primarylight],
      type: 'solid',
      opacity: 0.05,
    },
    markers: {
      size: 0,
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val: number) => `${val} sales`,
      },
    },
  };

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 10) {
      return {
        color: 'error' as const,
        bgcolor: (theme: any) => theme.palette.error.light,
        textColor: (theme: any) => theme.palette.error.main,
        label: 'Low Stock'
      };
    }
    if (stock <= 50) {
      return {
        color: 'warning' as const,
        bgcolor: (theme: any) => theme.palette.warning.light,
        textColor: (theme: any) => theme.palette.warning.main,
        label: 'Medium Stock'
      };
    }
    return {
      color: 'success' as const,
      bgcolor: (theme: any) => theme.palette.success.light,
      textColor: (theme: any) => theme.palette.success.main,
      label: 'In Stock'
    };
  };

  const generateSalesChart = (sales: number, maxSales: number) => {
    const intensity = Math.max(0.3, sales / maxSales);
    const data = Array.from({ length: 5 }, () =>
      Math.floor(15 + (intensity * 25) + (Math.random() * 10))
    );
    return data;
  };

  const maxSales = Math.max(...products.map(p => p.sales), 1);

  return (
    <FeatureGateWrapper
      feature={FEATURES.ADVANCED_ANALYTICS}
      upgradePromptProps={{
        title: "Advanced Analytics Requires Premium",
        description: "Product performance analytics with detailed trends and insights are available with our premium plans.",
        suggestedPlan: "Professional"
      }}
    >
      <DashboardCard
        title="Top Product Performance"
        action={
          <CustomSelect
            labelId="month-dd"
            id="month-dd"
            size="small"
            value={month}
            onChange={handleChange}
          >
            <MenuItem value={1}>March 2025</MenuItem>
            <MenuItem value={2}>April 2025</MenuItem>
            <MenuItem value={3}>May 2025</MenuItem>
          </CustomSelect>
        }
      >
      <TableContainer>
        <Table
          aria-label="product performance table"
          sx={{
            whiteSpace: 'nowrap',
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 0 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Product
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Sales
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Stock Status
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Revenue
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Trend
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products && products.length > 0 ? (
              products.slice(0, 5).map((product, index) => {
                const stockStatus = getStockStatus(product.stock);
                const chartData = generateSalesChart(product.sales, maxSales);
                const chartOptions = {
                  ...optionsrow1chart,
                  colors: [product.sales > maxSales * 0.7 ? primary : grey]
                };
                const chartSeries = [{
                  name: 'Sales Trend',
                  color: product.sales > maxSales * 0.7 ? primary : grey,
                  data: chartData,
                }];

                return (
                  <TableRow key={product._id}>
                    <TableCell sx={{ pl: 0 }}>
                      <Stack direction="row" spacing={2}>
                        <Avatar
                          src={product.image || "/images/products/default.jpg"}
                          variant="rounded"
                          alt={product.title}
                          sx={{ width: 48, height: 48 }}
                        />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {product.title}
                          </Typography>
                          <Typography color="textSecondary" fontSize="12px" variant="subtitle2">
                            {product.category || 'General'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                        {product.sales} units
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        sx={{
                          bgcolor: stockStatus.bgcolor,
                          color: stockStatus.textColor,
                          borderRadius: '6px',
                          width: 'auto',
                          minWidth: 80,
                        }}
                        size="small"
                        label={`${product.stock} ${stockStatus.label}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {formatCurrency(product.revenue)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chart
                        options={chartOptions}
                        series={chartSeries}
                        type="area"
                        height="35px"
                        width="100px"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    No product performance data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardCard>
    </FeatureGateWrapper>
  );
};

export default ProductPerformances;
