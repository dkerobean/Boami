'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Pagination,
  Stack
} from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(dashboard)/layout/shared/breadcrumb/Breadcrumb';
import RecentActivitiesTable from '@/app/components/apps/ecommerce/shopManagement/RecentActivitiesTable';

const BCrumb = [
  {
    to: '/apps/ecommerce/shop',
    title: 'Shop Management',
  },
  {
    title: 'Recent Activities',
  },
];

interface ActivityFilters {
  search: string;
  type: string;
  dateRange: string;
  page: number;
  limit: number;
}

const RecentActivitiesPage = () => {
  const [filters, setFilters] = useState<ActivityFilters>({
    search: '',
    type: '',
    dateRange: '',
    page: 1,
    limit: 20
  });
  
  const [totalActivities, setTotalActivities] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivities();
  }, [filters]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        limit: filters.limit.toString(),
        offset: ((filters.page - 1) * filters.limit).toString()
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.type) params.append('type', filters.type);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);

      const response = await fetch(`/api/shop-management/recent-activities?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setActivities(result.data.activities || []);
          setTotalActivities(result.data.total || 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof ActivityFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: field !== 'page' ? 1 : value // Reset page when other filters change
    }));
  };

  const totalPages = Math.ceil(totalActivities / filters.limit);

  return (
    <PageContainer title="Recent Activities" description="View all recent shop activities">
      <Breadcrumb title="Recent Activities" items={BCrumb} />
      
      <Card>
        <CardContent>
          <Box mb={3}>
            <Typography variant="h5" mb={3}>
              Recent Shop Activities
            </Typography>
            
            {/* Filters */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search activities..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={20} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={filters.type}
                    label="Activity Type"
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="product_added">Product Added</MenuItem>
                    <MenuItem value="stock_updated">Stock Updated</MenuItem>
                    <MenuItem value="product_sold">Product Sold</MenuItem>
                    <MenuItem value="alert_triggered">Alert Triggered</MenuItem>
                    <MenuItem value="alert_resolved">Alert Resolved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={filters.dateRange}
                    label="Date Range"
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  >
                    <MenuItem value="">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="quarter">This Quarter</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Per Page</InputLabel>
                  <Select
                    value={filters.limit}
                    label="Per Page"
                    onChange={(e) => handleFilterChange('limit', e.target.value)}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Activities Table */}
          <RecentActivitiesTable 
            activities={activities}
            loading={loading}
            onRefresh={fetchActivities}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Stack direction="row" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={filters.page}
                onChange={(_, page) => handleFilterChange('page', page)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Stack>
          )}
          
          {/* Summary */}
          <Box mt={2} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, totalActivities)} of {totalActivities} activities
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default RecentActivitiesPage;