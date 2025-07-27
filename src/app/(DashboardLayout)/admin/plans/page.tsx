'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  IconHome,
  IconSettings,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/payment-utils';

interface PlanFeature {
  enabled: boolean;
  limit?: number;
  description: string;
}

interface Plan {
  _id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: Record<string, PlanFeature>;
  sortOrder: number;
  popular: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminPlansPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'NGN',
    sortOrder: 0,
    popular: false,
    isActive: true,
    features: {
      advanced_analytics: { enabled: false, description: 'Advanced Analytics' },
      bulk_operations: { enabled: false, description: 'Bulk Operations' },
      api_access: { enabled: false, description: 'API Access' },
      priority_support: { enabled: false, description: 'Priority Support' },
      custom_branding: { enabled: false, description: 'Custom Branding' },
      advanced_reporting: { enabled: false, description: 'Advanced Reporting' },
      team_collaboration: { enabled: false, description: 'Team Collaboration' },
      automated_workflows: { enabled: false, description: 'Automated Workflows' },
      integrations: { enabled: false, description: 'Third-party Integrations' },
      unlimited_storage: { enabled: false, description: 'Unlimited Storage' }
    }
  });

  // Check admin access
  useEffect(() => {
    if (!hasRole('admin')) {
      setError('Access denied. Admin privileges required.');
      return;
    }
    fetchPlans();
  }, [hasRole]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.data);
      } else {
        setError(data.error || 'Failed to fetch plans');
      }
    } catch (err: any) {
      setError('Failed to fetch plans');
      console.error('Fetch plans error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: {
            monthly: formData.monthlyPrice,
            annual: formData.annualPrice,
            currency: formData.currency
          },
          features: formData.features,
          sortOrder: formData.sortOrder,
          popular: formData.popular,
          isActive: formData.isActive
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Plan created successfully');
        setCreateDialogOpen(false);
        resetForm();
        fetchPlans();
      } else {
        setError(data.error || 'Failed to create plan');
      }
    } catch (err) {
      setError('Failed to create plan');
      console.error('Create plan error:', err);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/admin/plans/${selectedPlan._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: {
            monthly: formData.monthlyPrice,
            annual: formData.annualPrice,
            currency: formData.currency
          },
          features: formData.features,
          sortOrder: formData.sortOrder,
          popular: formData.popular,
          isActive: formData.isActive
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Plan updated successfully');
        setEditDialogOpen(false);
        setSelectedPlan(null);
        resetForm();
        fetchPlans();
      } else {
        setError(data.error || 'Failed to update plan');
      }
    } catch (err) {
      setError('Failed to update plan');
      console.error('Update plan error:', err);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/admin/plans/${selectedPlan._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Plan deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedPlan(null);
        fetchPlans();
      } else {
        setError(data.error || 'Failed to delete plan');
      }
    } catch (err) {
      setError('Failed to delete plan');
      console.error('Delete plan error:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      monthlyPrice: 0,
      annualPrice: 0,
      currency: 'NGN',
      sortOrder: 0,
      popular: false,
      isActive: true,
      features: {
        advanced_analytics: { enabled: false, description: 'Advanced Analytics' },
        bulk_operations: { enabled: false, description: 'Bulk Operations' },
        api_access: { enabled: false, description: 'API Access' },
        priority_support: { enabled: false, description: 'Priority Support' },
        custom_branding: { enabled: false, description: 'Custom Branding' },
        advanced_reporting: { enabled: false, description: 'Advanced Reporting' },
        team_collaboration: { enabled: false, description: 'Team Collaboration' },
        automated_workflows: { enabled: false, description: 'Automated Workflows' },
        integrations: { enabled: false, description: 'Third-party Integrations' },
        unlimited_storage: { enabled: false, description: 'Unlimited Storage' }
      }
    });
  };

  const openEditDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.price.monthly,
      annualPrice: plan.price.annual,
      currency: plan.price.currency,
      sortOrder: plan.sortOrder,
      popular: plan.popular,
      isActive: plan.isActive,
      features: plan.features
    });
    setEditDialogOpen(true);
  };

  const handleFeatureToggle = (featureKey: string) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: {
          ...prev.features[featureKey],
          enabled: !prev.features[featureKey].enabled
        }
      }
    }));
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
            Admin - Plans
          </Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Plan Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage subscription plans
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<IconPlus />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Plan
          </Button>
        </Box>
      </Box>

      {/* Plans Grid */}
      <Grid container spacing={3}>
        {plans.map((plan) => (
          <Grid item xs={12} md={6} lg={4} key={plan._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <div>
                    <Typography variant="h6" fontWeight={600}>
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {plan.description}
                    </Typography>
                  </div>
                  <Box display="flex" gap={1}>
                    {plan.popular && (
                      <Chip label="Popular" color="primary" size="small" />
                    )}
                    <Chip
                      label={plan.isActive ? 'Active' : 'Inactive'}
                      color={plan.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="h4" color="primary.main">
                    {formatCurrency(plan.price.monthly, plan.price.currency)}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /month
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(plan.price.annual, plan.price.currency)}/year
                  </Typography>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Features:
                </Typography>
                <Box mb={2}>
                  {Object.entries(plan.features)
                    .filter(([_, feature]) => feature.enabled)
                    .slice(0, 3)
                    .map(([key, feature]) => (
                      <Typography key={key} variant="body2" color="text.secondary">
                        • {feature.description}
                      </Typography>
                    ))}
                  {Object.values(plan.features).filter(f => f.enabled).length > 3 && (
                    <Typography variant="body2" color="text.secondary">
                      + {Object.values(plan.features).filter(f => f.enabled).length - 3} more
                    </Typography>
                  )}
                </Box>
              </CardContent>

              <Box p={2} pt={0}>
                <Box display="flex" justifyContent="space-between">
                  <Tooltip title="Edit Plan">
                    <IconButton onClick={() => openEditDialog(plan)}>
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Plan">
                    <IconButton
                      color="error"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create/Edit Plan Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? 'Create New Plan' : 'Edit Plan'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plan Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Monthly Price"
                type="number"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyPrice: parseFloat(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Annual Price"
                type="number"
                value={formData.annualPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, annualPrice: parseFloat(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  label="Currency"
                >
                  <MenuItem value="NGN">NGN</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.popular}
                    onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                  />
                }
                label="Popular Plan"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Features
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(formData.features).map(([key, feature]) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={feature.enabled}
                          onChange={() => handleFeatureToggle(key)}
                        />
                      }
                      label={feature.description}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={createDialogOpen ? handleCreatePlan : handleUpdatePlan}
            variant="contained"
          >
            {createDialogOpen ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the plan "{selectedPlan?.name}"?
            This action cannot be undone and may affect existing subscriptions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePlan} color="error" variant="contained">
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

export default AdminPlansPage;