'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  Pagination,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  IconHome,
  IconSettings,
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
  IconRefresh,
  IconPlus
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/payment-utils';

interface SubscriptionData {
  _id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  plan: {
    name: string;
    price: {
      monthly: number;
      currency: string;
    };
  };
  status: string;
  isActive: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRevenue: number;
  annualRevenue: number;
  churnRate: number;
}

const AdminSubscriptionsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters and pagination
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [limit] = useState<number>(10);

  // Dialog states
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  // Check admin access
  useEffect(() => {
    if (!hasRole('admin')) {
      setError('Access denied. Admin privileges required.');
      return;
    }
  }, [hasRole]);

  // Fetch data
  useEffect(() => {
    if (hasRole('admin')) {
      fetchSubscriptions();
      fetchStats();
    }
  }, [page, statusFilter, searchTerm, hasRole]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        search: searchTerm
      });

      const response = await fetch(`/api/admin/subscriptions?${params}`);
      const data = await response.json();

      if (data.success) {
        setSubscriptions(data.data.subscriptions);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        setError(data.error || 'Failed to fetch subscriptions');
      }
    } catch (err: any) {
      setError('Failed to fetch subscriptions');
      console.error('Fetch subscriptions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Subscription status updated successfully');
        fetchSubscriptions();
        fetchStats();
      } else {
        setError(data.error || 'Failed to update subscription');
      }
    } catch (err) {
      setError('Failed to update subscription');
      console.error('Update subscription error:', err);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Subscription deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedSubscription(null);
        fetchSubscriptions();
        fetchStats();
      } else {
        setError(data.error || 'Failed to delete subscription');
      }
    } catch (err) {
      setError('Failed to delete subscription');
      console.error('Delete subscription error:', err);
    }
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'error';
    switch (status) {
      case 'active': return 'success';
      case 'cancelled': return 'warning';
      case 'expired': return 'error';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const exportSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('Subscriptions exported successfully');
    } catch (err) {
      setError('Failed to export subscriptions');
      console.error('Export error:', err);
    }
  };

  if (!hasRole('admin')) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. Admin privileges required to view this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <IconHome size={18} />
            Home
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconSettings size={18} />
            Admin - Subscriptions
          </Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Subscription Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage user subscriptions, plans, and billing
            </Typography>
          </div>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<IconDownload />}
              onClick={exportSubscriptions}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<IconRefresh />}
              onClick={() => {
                fetchSubscriptions();
                fetchStats();
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary.main">
                  {stats.totalSubscriptions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Subscriptions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {stats.activeSubscriptions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main">
                  {stats.cancelledSubscriptions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cancelled
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="info.main">
                  {formatCurrency(stats.monthlyRevenue, 'NGN')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monthly Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="secondary.main">
                  {formatCurrency(stats.annualRevenue, 'NGN')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Annual Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="error.main">
                  {stats.churnRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Churn Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search users"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Revenue</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription._id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {subscription.user.firstName} {subscription.user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {subscription.user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {subscription.plan.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={subscription.status}
                        color={getStatusColor(subscription.status, subscription.isActive)}
                        size="small"
                      />
                      {subscription.cancelAtPeriodEnd && (
                        <Chip
                          label="Cancelling"
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatCurrency(subscription.plan.price.monthly, subscription.plan.price.currency)}/mo
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {' '}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(subscription.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setViewDialogOpen(true);
                            }}
                          >
                            <IconEye size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setEditDialogOpen(true);
                            }}
                          >
                            <IconEdit size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Subscription Details</DialogTitle>
        <DialogContent>
          {selectedSubscription && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">User</Typography>
                <Typography variant="body1">
                  {selectedSubscription.user.firstName} {selectedSubscription.user.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSubscription.user.email}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Plan</Typography>
                <Typography variant="body1">{selectedSubscription.plan.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={selectedSubscription.status}
                  color={getStatusColor(selectedSubscription.status, selectedSubscription.isActive)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Revenue</Typography>
                <Typography variant="body1">
                  {formatCurrency(selectedSubscription.plan.price.monthly, selectedSubscription.plan.price.currency)}/month
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Current Period</Typography>
                <Typography variant="body1">
                  {new Date(selectedSubscription.currentPeriodStart).toLocaleDateString()} - {' '}
                  {new Date(selectedSubscription.currentPeriodEnd).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                <Typography variant="body1">
                  {new Date(selectedSubscription.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Subscription</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this subscription? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSubscription} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminSubscriptionsPage;