'use client';

import { useState, useEffect } from 'react';
import { Grid, Box, Card, CardContent, Typography, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { IconAlertCircle, IconEye, IconCheck, IconX, IconSettings } from '@tabler/icons-react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/app/components/shared/BlankCard';
import StockAlertsTable from '@/app/components/apps/ecommerce/stockAlerts/StockAlertsTable';
import QuickRestockModal from '@/app/components/apps/ecommerce/stockAlerts/QuickRestockModal';

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
  id?: string;
  _id?: string;
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

interface StockAlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  active: number;
  acknowledged: number;
  resolved: number;
}

const StockAlertsPage = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<StockAlertStats>({
    total: 0, critical: 0, high: 0, medium: 0, low: 0,
    active: 0, acknowledged: 0, resolved: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [restockModalOpen, setRestockModalOpen] = useState<boolean>(false);
  const [selectedAlertForRestock, setSelectedAlertForRestock] = useState<StockAlert | null>(null);

  // Helper function to safely get alert ID
  const getAlertId = (alert: StockAlert): string => {
    const alertId = alert.id || alert._id;
    if (!alertId) {
      console.error('Alert missing ID:', alert);
      return '';
    }
    return alertId;
  };

  const fetchStockAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/stock-alerts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock alerts');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data || []);
        setStatistics(data.statistics || {
          total: 0, critical: 0, high: 0, medium: 0, low: 0,
          active: 0, acknowledged: 0, resolved: 0
        });
      } else {
        throw new Error(data.error || 'Failed to fetch stock alerts');
      }
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch stock alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockAlerts();
  }, []);

  const getAlertStats = () => {
    return statistics;
  };

  const handleBulkAction = async (action: 'acknowledge' | 'resolve' | 'dismiss') => {
    if (selectedAlerts.length === 0) return;
    
    try {
      const status = action === 'acknowledge' ? 'acknowledged' : 'resolved';
      
      const response = await fetch('/api/stock-alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertIds: selectedAlerts,
          updateData: { status }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update alerts');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh alerts after successful update
        await fetchStockAlerts();
        setSelectedAlerts([]);
      } else {
        throw new Error(data.error || 'Failed to update alerts');
      }
    } catch (error) {
      console.error('Error updating alerts:', error);
      setError(error instanceof Error ? error.message : 'Failed to update alerts');
    }
  };

  const handleRestock = async (alertId: string, quantity: number, reason: string): Promise<boolean> => {
    try {
      console.log('Starting restock process for alert:', alertId, 'quantity:', quantity);
      
      // Call the restock API endpoint which will handle MongoDB operations
      const response = await fetch(`/api/stock-alerts/${alertId}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity,
          reason,
          resolveAlert: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to restock`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('Restock successful:', data);
        // Refresh alerts from server to get current state
        await fetchStockAlerts();
        return true;
      } else {
        throw new Error(data.error || 'Failed to restock');
      }

    } catch (error) {
      console.error('Error restocking:', error);
      setError(error instanceof Error ? error.message : 'Failed to restock');
      return false;
    }
  };

  const handleOpenRestockModal = (alert: StockAlert) => {
    setSelectedAlertForRestock(alert);
    setRestockModalOpen(true);
  };

  const handleCloseRestockModal = () => {
    setRestockModalOpen(false);
    setSelectedAlertForRestock(null);
  };

  const stats = getAlertStats();

  return (
    <PageContainer title="Stock Alerts" description="Monitor and manage inventory stock alerts">
      <Breadcrumb title="Stock Alerts" items={BCrumb} />
      
      <>
        {error && (
          <Box mb={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" color="error">
                        Error: {error}
                      </Typography>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        onClick={fetchStockAlerts}
                      >
                        Retry
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </>
      
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
                    {stats.active}
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
            onRefresh={fetchStockAlerts}
            onRestock={handleRestock}
            onOpenRestockModal={handleOpenRestockModal}
          />
        </CardContent>
      </BlankCard>

      {/* Quick Restock Modal */}
      <QuickRestockModal
        open={restockModalOpen}
        onClose={handleCloseRestockModal}
        alert={selectedAlertForRestock}
        onRestock={handleRestock}
      />
    </PageContainer>
  );
};

export default StockAlertsPage;