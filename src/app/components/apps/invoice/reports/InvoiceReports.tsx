"use client";
import React, { useState, useContext, useEffect, useMemo } from "react";
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
  CircularProgress,
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
import { InvoiceContext } from "@/app/context/InvoiceContext";

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
  
  const context = useContext(InvoiceContext);
  
  if (!context) {
    throw new Error('InvoiceReports must be used within an InvoiceProvider');
  }
  
  const { invoices, loading, fetchInvoices } = context;

  useEffect(() => {
    if (!invoices.length && !loading) {
      fetchInvoices();
    }
  }, [invoices.length, loading, fetchInvoices]);

  // Calculate date range based on timeRange filter
  const getDateRange = (range: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate = new Date();

    switch (range) {
      case "last_7_days":
        startDate.setDate(today.getDate() - 7);
        break;
      case "last_30_days":
        startDate.setDate(today.getDate() - 30);
        break;
      case "last_90_days":
        startDate.setDate(today.getDate() - 90);
        break;
      case "last_year":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    return { startDate, endDate: today };
  };

  // Filter invoices based on time range
  const filteredInvoices = useMemo(() => {
    if (!invoices.length) return [];
    
    const { startDate, endDate } = getDateRange(timeRange);
    
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.orderDate);
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });
  }, [invoices, timeRange]);

  // Calculate real invoice statistics
  const invoiceStats = useMemo(() => {
    if (!filteredInvoices.length) {
      return {
        totalRevenue: 0,
        totalInvoices: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        averageValue: 0,
        collectionRate: 0,
      };
    }

    const totalRevenue = filteredInvoices.reduce((sum, invoice) => {
      if (invoice.status === 'Paid' || invoice.completed) {
        return sum + (invoice.grandTotal || invoice.totalCost);
      }
      return sum;
    }, 0);

    const pendingAmount = filteredInvoices.reduce((sum, invoice) => {
      if (invoice.status === 'Pending' || invoice.status === 'Sent') {
        return sum + (invoice.grandTotal || invoice.totalCost);
      }
      return sum;
    }, 0);

    const overdueAmount = filteredInvoices.reduce((sum, invoice) => {
      if (invoice.status === 'Overdue') {
        return sum + (invoice.grandTotal || invoice.totalCost);
      }
      return sum;
    }, 0);

    const totalInvoices = filteredInvoices.length;
    const averageValue = totalInvoices > 0 ? (totalRevenue + pendingAmount + overdueAmount) / totalInvoices : 0;
    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid' || inv.completed).length;
    const collectionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    return {
      totalRevenue,
      totalInvoices,
      pendingAmount,
      overdueAmount,
      averageValue,
      collectionRate,
    };
  }, [filteredInvoices]);

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

  // Generate real chart data
  const revenueChartData = useMemo(() => {
    if (!filteredInvoices.length) {
      return {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        revenue: new Array(12).fill(0),
        collections: new Array(12).fill(0)
      };
    }

    const monthlyData = new Array(12).fill(0).map(() => ({ revenue: 0, collections: 0 }));
    const currentYear = new Date().getFullYear();
    
    filteredInvoices.forEach(invoice => {
      const date = new Date(invoice.orderDate);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        const amount = invoice.grandTotal || invoice.totalCost;
        
        monthlyData[month].revenue += amount;
        if (invoice.status === 'Paid' || invoice.completed) {
          monthlyData[month].collections += amount;
        }
      }
    });

    return {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      revenue: monthlyData.map(m => m.revenue),
      collections: monthlyData.map(m => m.collections)
    };
  }, [filteredInvoices]);

  const revenueChartSeries = [
    {
      name: "Revenue",
      data: revenueChartData.revenue,
    },
    {
      name: "Collections",
      data: revenueChartData.collections,
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

  // Calculate status distribution from real data
  const statusDistribution = useMemo(() => {
    if (!filteredInvoices.length) {
      return { paid: 0, pending: 0, overdue: 0, draft: 0 };
    }

    return filteredInvoices.reduce((acc, invoice) => {
      if (invoice.status === 'Paid' || invoice.completed) {
        acc.paid++;
      } else if (invoice.status === 'Pending' || invoice.status === 'Sent') {
        acc.pending++;
      } else if (invoice.status === 'Overdue') {
        acc.overdue++;
      } else {
        acc.draft++;
      }
      return acc;
    }, { paid: 0, pending: 0, overdue: 0, draft: 0 });
  }, [filteredInvoices]);

  const statusChartSeries = [
    statusDistribution.paid,
    statusDistribution.pending,
    statusDistribution.overdue,
    statusDistribution.draft
  ];

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

  // Calculate payment timeline data
  const paymentTimelineData = useMemo(() => {
    if (!filteredInvoices.length) {
      return {
        onTime: new Array(12).fill(0),
        late: new Array(12).fill(0),
        overdue: new Array(12).fill(0)
      };
    }

    const monthlyPayments = new Array(12).fill(0).map(() => ({ onTime: 0, late: 0, overdue: 0 }));
    const currentYear = new Date().getFullYear();
    
    filteredInvoices.forEach(invoice => {
      const date = new Date(invoice.orderDate);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        const amount = invoice.grandTotal || invoice.totalCost;
        
        if (invoice.status === 'Paid' || invoice.completed) {
          monthlyPayments[month].onTime += amount;
        } else if (invoice.status === 'Pending' || invoice.status === 'Sent') {
          monthlyPayments[month].late += amount;
        } else if (invoice.status === 'Overdue') {
          monthlyPayments[month].overdue += amount;
        }
      }
    });

    return {
      onTime: monthlyPayments.map(m => m.onTime),
      late: monthlyPayments.map(m => m.late),
      overdue: monthlyPayments.map(m => m.overdue)
    };
  }, [filteredInvoices]);

  const paymentTimelineSeries = [
    {
      name: "On Time",
      data: paymentTimelineData.onTime,
    },
    {
      name: "Late (1-30 days)",
      data: paymentTimelineData.late,
    },
    {
      name: "Overdue (30+ days)",
      data: paymentTimelineData.overdue,
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={40} />
      </Box>
    );
  }

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
                    <Chip label={`${statusDistribution.paid} invoices`} color="success" variant="outlined" />
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
                    <Chip label={`${statusDistribution.pending} invoices`} color="warning" variant="outlined" />
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
                    <Chip label={`${statusDistribution.overdue} invoices`} color="error" variant="outlined" />
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
                    <Chip label={`${statusDistribution.draft} invoices`} variant="outlined" />
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