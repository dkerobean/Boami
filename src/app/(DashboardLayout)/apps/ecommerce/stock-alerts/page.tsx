'use client';

import { useState, useEffect } from 'react';
import { Grid, Box, Card, CardContent, Typography, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { IconAlertCircle, IconEye, IconCheck, IconX, IconSettings } from '@tabler/icons-react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/app/components/shared/BlankCard';
import StockAlertsTable from '@/app/components/apps/ecommerce/stockAlerts/StockAlertsTable';

const BCrumb = [
  {
    to: '/dashboards/ecommerce',
    title: 'Dashboard',
  },
  {
    title: 'Stock Alerts',
  },
];

interface StockAlert {
  id: string;
  productName: string;
  sku: string;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock' | 'high_demand';
  priority: 'critical' | 'high' | 'medium' | 'low';
  currentStock: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  lastUpdated: string;
}

// Mock data for demonstration
const mockStockAlerts: StockAlert[] = [
  {
    id: '1',
    productName: 'Premium Wireless Headphones',
    sku: 'WH-001',
    alertType: 'low_stock',
    priority: 'critical',
    currentStock: 2,
    threshold: 10,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    lastUpdated: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    productName: 'Bluetooth Speaker',
    sku: 'SPK-002',
    alertType: 'out_of_stock',
    priority: 'critical',
    currentStock: 0,
    threshold: 5,
    status: 'active',
    createdAt: '2024-01-14T09:15:00Z',
    lastUpdated: '2024-01-14T09:15:00Z',
  },
  {
    id: '3',
    productName: 'Smartphone Case',
    sku: 'SC-003',
    alertType: 'low_stock',
    priority: 'high',
    currentStock: 8,
    threshold: 15,
    status: 'acknowledged',
    createdAt: '2024-01-13T14:20:00Z',
    lastUpdated: '2024-01-13T16:45:00Z',
  },
  {
    id: '4',
    productName: 'USB-C Cable',
    sku: 'UC-004',
    alertType: 'high_demand',
    priority: 'medium',
    currentStock: 25,
    threshold: 50,
    status: 'active',
    createdAt: '2024-01-12T11:00:00Z',
    lastUpdated: '2024-01-12T11:00:00Z',
  },
];

const StockAlertsPage = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAlerts(mockStockAlerts);
      setLoading(false);
    }, 1000);
  }, []);

  const getAlertStats = () => {
    const stats = {
      critical: alerts.filter(a => a.priority === 'critical' && a.status === 'active').length,
      high: alerts.filter(a => a.priority === 'high' && a.status === 'active').length,
      medium: alerts.filter(a => a.priority === 'medium' && a.status === 'active').length,
      low: alerts.filter(a => a.priority === 'low' && a.status === 'active').length,
      total: alerts.filter(a => a.status === 'active').length,
    };
    return stats;
  };

  const handleBulkAction = (action: 'acknowledge' | 'resolve' | 'dismiss') => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        selectedAlerts.includes(alert.id)
          ? { ...alert, status: action === 'acknowledge' ? 'acknowledged' : 'resolved' }
          : alert
      )
    );
    setSelectedAlerts([]);
  };

  const stats = getAlertStats();

  return (
    <PageContainer title="Stock Alerts" description="Monitor and manage inventory stock alerts">
      <Breadcrumb title="Stock Alerts" items={BCrumb} />
      
      {/* Alert Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="error.main">
                    {stats.critical}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Critical Alerts
                  </Typography>
                </Box>
                <IconAlertCircle size={48} color="red" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats.high}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    High Priority
                  </Typography>
                </Box>
                <IconAlertCircle size={48} color="orange" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {stats.medium}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Medium Priority
                  </Typography>
                </Box>
                <IconAlertCircle size={48} color="blue" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats.total}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Active
                  </Typography>
                </Box>
                <IconAlertCircle size={48} color="green" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bulk Actions */}
      <Box>
        {selectedAlerts.length > 0 && (
          <Box mb={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">
                    {selectedAlerts.length} alert(s) selected
                  </Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleBulkAction('acknowledge')}
                      startIcon={<IconCheck />}
                      sx={{ mr: 1 }}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={() => handleBulkAction('resolve')}
                      startIcon={<IconCheck />}
                      sx={{ mr: 1 }}
                    >
                      Resolve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleBulkAction('dismiss')}
                      startIcon={<IconX />}
                    >
                      Dismiss
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {/* Stock Alerts Table */}
      <BlankCard>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h5">Stock Alerts</Typography>
            <Box>
              <Tooltip title="Manage Alert Settings">
                <IconButton>
                  <IconSettings />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <StockAlertsTable
            alerts={alerts}
            loading={loading}
            selectedAlerts={selectedAlerts}
            onSelectionChange={setSelectedAlerts}
          />
        </CardContent>
      </BlankCard>
    </PageContainer>
  );
};

export default StockAlertsPage;