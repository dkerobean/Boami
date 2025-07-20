"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Chip,
  Button,
  Tab,
  Tabs,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  IconReportAnalytics,
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyDollar,
  IconFileInvoice,
  IconCalendarTime,
  IconDownload,
  IconFilter,
} from "@tabler/icons-react";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const InvoiceReports: React.FC = () => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const success = theme.palette.success.main;
  const warning = theme.palette.warning.main;
  const error = theme.palette.error.main;
  
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState("last_30_days");

  // Sample data for demonstration
  const invoiceStats = {
    totalRevenue: 124850,
    totalInvoices: 156,
    pendingAmount: 23450,
    overdueAmount: 8750,
    averageValue: 800.32,
    collectionRate: 89.5,
  };

  // Revenue trend data
  const revenueChartOptions: any = {
    chart: {
      height: 350,
      type: "area",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      foreColor: "#adb0bb",
      zoom: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    colors: [primary, secondary],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `$${val.toLocaleString()}`,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `$${val.toLocaleString()}`,
      },
    },
  };

  const revenueChartSeries = [
    {
      name: "Revenue",
      data: [8000, 12000, 9500, 15000, 18000, 14000, 16500, 19000, 22000, 17500, 20000, 24000],
    },
    {
      name: "Collections",
      data: [7200, 10800, 8550, 13500, 16200, 12600, 14850, 17100, 19800, 15750, 18000, 21600],
    },
  ];

  // Invoice status distribution
  const statusChartOptions: any = {
    chart: {
      type: "donut",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      foreColor: "#adb0bb",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
        },
      },
    },
    labels: ["Paid", "Pending", "Overdue", "Draft"],
    colors: [success, warning, error, "#adb0bb"],
    legend: {
      show: true,
      position: "bottom",
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} invoices`,
      },
    },
  };

  const statusChartSeries = [89, 35, 12, 8];

  // Payment timeline
  const paymentTimelineOptions: any = {
    chart: {
      type: "bar",
      height: 350,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      foreColor: "#adb0bb",
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    colors: [primary, warning, error],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
    yaxis: {
      title: {
        text: "Amount ($)",
      },
      labels: {
        formatter: (val: number) => `$${val.toLocaleString()}`,
      },
    },
    legend: {
      position: "top",
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `$${val.toLocaleString()}`,
      },
    },
  };

  const paymentTimelineSeries = [
    {
      name: "On Time",
      data: [15000, 18000, 12000, 22000, 19000, 16000, 21000, 25000, 18000, 20000, 23000, 27000],
    },
    {
      name: "Late (1-30 days)",
      data: [3000, 4000, 2500, 5000, 3500, 3000, 4500, 6000, 3800, 4200, 5100, 6500],
    },
    {
      name: "Overdue (30+ days)",
      data: [1000, 1500, 800, 2000, 1200, 1000, 1800, 2500, 1500, 1800, 2200, 2800],
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={2}>
          <IconReportAnalytics size={24} />
          <Typography variant="h5">
            Invoice Reports & Analytics
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="last_7_days">Last 7 days</MenuItem>
              <MenuItem value="last_30_days">Last 30 days</MenuItem>
              <MenuItem value="last_90_days">Last 90 days</MenuItem>
              <MenuItem value="last_year">Last year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<IconDownload />}
          >
            Export Report
          </Button>
        </Stack>
      </Stack>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: "primary.light",
                    borderRadius: 1,
                  }}
                >
                  <IconCurrencyDollar color={primary} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(invoiceStats.totalRevenue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: "secondary.light",
                    borderRadius: 1,
                  }}
                >
                  <IconFileInvoice color={secondary} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {invoiceStats.totalInvoices}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Invoices
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: "warning.light",
                    borderRadius: 1,
                  }}
                >
                  <IconCalendarTime color={warning} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(invoiceStats.pendingAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: "error.light",
                    borderRadius: 1,
                  }}
                >
                  <IconTrendingDown color={error} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(invoiceStats.overdueAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: "info.light",
                    borderRadius: 1,
                  }}
                >
                  <IconTrendingUp color="info.main" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(invoiceStats.averageValue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Value
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: "success.light",
                    borderRadius: 1,
                  }}
                >
                  <IconTrendingUp color={success} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {invoiceStats.collectionRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Collection Rate
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Revenue Trends" />
            <Tab label="Invoice Status" />
            <Tab label="Payment Timeline" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Revenue & Collections Trend
            </Typography>
            <Chart
              options={revenueChartOptions}
              series={revenueChartSeries}
              type="area"
              height="400px"
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box p={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Invoice Status Distribution
                </Typography>
                <Chart
                  options={statusChartOptions}
                  series={statusChartSeries}
                  type="donut"
                  height="400px"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Status Summary
                </Typography>
                <Stack spacing={3} mt={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: success,
                          borderRadius: "50%",
                        }}
                      />
                      <Typography>Paid Invoices</Typography>
                    </Stack>
                    <Chip label="89 invoices" color="success" variant="outlined" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: warning,
                          borderRadius: "50%",
                        }}
                      />
                      <Typography>Pending Payment</Typography>
                    </Stack>
                    <Chip label="35 invoices" color="warning" variant="outlined" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: error,
                          borderRadius: "50%",
                        }}
                      />
                      <Typography>Overdue</Typography>
                    </Stack>
                    <Chip label="12 invoices" color="error" variant="outlined" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: "#adb0bb",
                          borderRadius: "50%",
                        }}
                      />
                      <Typography>Draft</Typography>
                    </Stack>
                    <Chip label="8 invoices" variant="outlined" />
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Payment Timeline Analysis
            </Typography>
            <Chart
              options={paymentTimelineOptions}
              series={paymentTimelineSeries}
              type="bar"
              height="400px"
            />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default InvoiceReports;