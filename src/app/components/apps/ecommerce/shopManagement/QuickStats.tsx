'use client';

import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Skeleton,
} from '@mui/material';
import {
  IconPackage,
  IconAlertTriangle,
  IconTrendingUp,
  IconEye,
} from '@tabler/icons-react';

interface StatsData {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  publishedProducts: number;
  activeAlerts: number;
  loading: boolean;
  lastUpdated?: string;
}

const QuickStats = () => {
  const [stats, setStats] = useState<StatsData>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    publishedProducts: 0,
    activeAlerts: 0,
    loading: true,
  });

  useEffect(() => {
    // Fetch real-time stats from MongoDB
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/shop-management/stats');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStats({
              totalProducts: result.data.totalProducts || 0,
              lowStockProducts: result.data.lowStockProducts || 0,
              outOfStockProducts: result.data.outOfStockProducts || 0,
              publishedProducts: result.data.publishedProducts || 0,
              activeAlerts: result.data.activeAlerts || 0,
              loading: false,
              lastUpdated: result.data.lastUpdated,
            });
          } else {
            throw new Error(result.error);
          }
        } else {
          throw new Error('API request failed');
        }
      } catch (error) {
        console.error('Failed to fetch real-time stats:', error);
        // Fallback to the existing ecommerce stats API
        try {
          const fallbackResponse = await fetch('/api/dashboard/ecommerce/stats');
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setStats({
              totalProducts: data.data.totalProducts || 0,
              lowStockProducts: data.data.lowStockProducts || 0,
              outOfStockProducts: 0,
              publishedProducts: data.data.totalProducts || 0,
              activeAlerts: 0,
              loading: false,
            });
          } else {
            throw new Error('Fallback API failed');
          }
        } catch (fallbackError) {
          console.warn('Both APIs failed, using default values');
          setStats({
            totalProducts: 0,
            lowStockProducts: 0,
            outOfStockProducts: 0,
            publishedProducts: 0,
            activeAlerts: 0,
            loading: false,
          });
        }
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds for real-time updates
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    bgColor 
  }: { 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string; 
    bgColor: string; 
  }) => (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight="700" color={color}>
              {stats.loading ? <Skeleton width={60} height={40} /> : value.toLocaleString()}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" mt={1}>
              {title}
            </Typography>
          </Box>
          <Avatar
            sx={{
              bgcolor: bgColor,
              width: 56,
              height: 56,
              color: color,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={3} mb={3}>
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={<IconPackage size={24} />}
          color="primary.main"
          bgColor="primary.light"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Published Products"
          value={stats.publishedProducts}
          icon={<IconEye size={24} />}
          color="success.main"
          bgColor="success.light"
        />
      </Grid>

      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockProducts}
          icon={<IconAlertTriangle size={24} />}
          color="warning.main"
          bgColor="warning.light"
        />
      </Grid>

      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Out of Stock"
          value={stats.outOfStockProducts}
          icon={<IconTrendingUp size={24} />}
          color="error.main"
          bgColor="error.light"
        />
      </Grid>
    </Grid>
  );
};

export default QuickStats;