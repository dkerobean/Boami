'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  LinearProgress,
  Stack,
  Button,
} from '@mui/material';
import { format } from 'date-fns';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconExternalLink,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface RecentActivity {
  _id: string;
  type: 'product_added' | 'stock_updated' | 'product_sold' | 'alert_triggered' | 'alert_resolved';
  title: string;
  description: string;
  timestamp: Date;
  productId?: string;
  productName?: string;
  metadata?: any;
}

interface TopProduct {
  _id: string;
  productId: string;
  name: string;
  sku: string;
  salesCount: number;
  revenue: number;
  currentStock: number;
  price: number;
  category: string[];
  image?: string;
}

const ShopOverview = () => {
  const router = useRouter();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent activities from MongoDB
        const activitiesResponse = await fetch('/api/shop-management/recent-activities?limit=5');
        if (activitiesResponse.ok) {
          const activitiesResult = await activitiesResponse.json();
          if (activitiesResult.success) {
            setRecentActivity(activitiesResult.data.activities || []);
          }
        }

        // Fetch top products from MongoDB
        const productsResponse = await fetch('/api/shop-management/top-products?limit=5&metric=sales');
        if (productsResponse.ok) {
          const productsResult = await productsResponse.json();
          if (productsResult.success) {
            setTopProducts(productsResult.data.topProducts || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh data every 2 minutes for real-time updates
    const interval = setInterval(fetchData, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const getStockStatus = (stock: number) => {
    if (stock <= 10) return { color: 'error' as const, label: 'Low Stock' };
    if (stock <= 25) return { color: 'warning' as const, label: 'Medium Stock' };
    return { color: 'success' as const, label: 'In Stock' };
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'product_added':
        return <IconTrendingUp size={16} />;
      case 'stock_updated':
        return <IconTrendingUp size={16} />;
      case 'product_sold':
        return <IconTrendingUp size={16} />;
      case 'alert_triggered':
        return <IconTrendingDown size={16} />;
      case 'alert_resolved':
        return <IconMinus size={16} />;
      default:
        return <IconMinus size={16} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'product_added':
        return 'success' as const;
      case 'stock_updated':
        return 'info' as const;
      case 'product_sold':
        return 'success' as const;
      case 'alert_triggered':
        return 'warning' as const;
      case 'alert_resolved':
        return 'info' as const;
      default:
        return 'info' as const;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Grid container spacing={3}>
      {/* Recent Activity */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Recent Activity
              </Typography>
              {!loading && recentActivity.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<IconExternalLink size={16} />}
                  onClick={() => router.push('/apps/ecommerce/shop/recent-activities')}
                  sx={{ borderRadius: 2 }}
                >
                  View All
                </Button>
              )}
            </Box>
            <Stack spacing={2}>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Box key={index} p={1.5}>
                    <LinearProgress />
                  </Box>
                ))
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity) => {
                  const activityColor = getActivityColor(activity.type);
                  const activityIcon = getActivityIcon(activity.type);
                  return (
                    <Box
                      key={activity._id}
                      display="flex"
                      alignItems="center"
                      gap={2}
                      p={1.5}
                      borderRadius={1}
                      bgcolor="background.paper"
                      border="1px solid"
                      borderColor="divider"
                    >
                      <Avatar
                        sx={{
                          bgcolor: `${activityColor}.light`,
                          color: `${activityColor}.main`,
                          width: 32,
                          height: 32,
                        }}
                      >
                        {activityIcon}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {activity.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No recent activities found
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Selling Products */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Top Selling Products
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Sales</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="center">Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><LinearProgress /></TableCell>
                        <TableCell><LinearProgress /></TableCell>
                        <TableCell><LinearProgress /></TableCell>
                        <TableCell><LinearProgress /></TableCell>
                      </TableRow>
                    ))
                  ) : topProducts.length > 0 ? (
                    topProducts.map((product) => {
                      const stockStatus = getStockStatus(product.currentStock);
                      return (
                        <TableRow key={product._id}>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {product.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {product.sku}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {product.salesCount}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(product.revenue)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${product.currentStock} units`}
                              color={stockStatus.color}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          No top products data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ShopOverview;