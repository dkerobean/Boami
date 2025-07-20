'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Typography,
  Divider,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface RecurringPayment {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  categoryId: {
    _id: string;
    name: string;
  };
  vendorId?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
}

interface Category {
  _id: string;
  name: string;
  isDefault: boolean;
}

interface Vendor {
  _id: string;
  name: string;
  email?: string;
}

interface RecurringPaymentFormProps {
  recurringPayment?: RecurringPayment | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date | null;
  categoryId: string;
  vendorId: string;
  isActive: boolean;
  hasEndDate: boolean;
}

interface FormErrors {
  type?: string;
  amount?: string;
  description?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  vendorId?: string;
  general?: string;
}

const RecurringPaymentForm: React.FC<RecurringPaymentFormProps> = ({
  recurringPayment,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    type: recurringPayment?.type || 'expense',
    amount: recurringPayment?.amount.toString() || '',
    description: recurringPayment?.description || '',
    frequency: recurringPayment?.frequency || 'monthly',
    startDate: recurringPayment ? new Date(recurringPayment.startDate) : new Date(),
    endDate: recurringPayment?.endDate ? new Date(recurringPayment.endDate) : null,
    categoryId: recurringPayment?.categoryId._id || '',
    vendorId: recurringPayment?.vendorId?._id || '',
    isActive: recurringPayment?.isActive ?? true,
    hasEndDate: !!recurringPayment?.endDate,
  });

  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchVendors();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const [incomeResponse, expenseResponse] = await Promise.all([
        fetch('/api/finance/categories/income'),
        fetch('/api/finance/categories/expense')
      ]);

      if (!incomeResponse.ok || !expenseResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const incomeData = await incomeResponse.json();
      const expenseData = await expenseResponse.json();

      setIncomeCategories(incomeData.categories || []);
      setExpenseCategories(expenseData.categories || []);
    } catch (err) {
      setErrors(prev => ({ ...prev, general: 'Failed to load categories' }));
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      const response = await fetch('/api/finance/vendors');
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }
      const data = await response.json();
      setVendors(data.data?.vendors || []);
    } catch (err) {
      setErrors(prev => ({ ...prev, general: 'Failed to load vendors' }));
    } finally {
      setVendorsLoading(false);
    }
  };

  const calculateNextDueDate = (startDate: Date, frequency: string): Date => {
    switch (frequency) {
      case 'daily':
        return addDays(startDate, 1);
      case 'weekly':
        return addWeeks(startDate, 1);
      case 'monthly':
        return addMonths(startDate, 1);
      case 'quarterly':
        return addMonths(startDate, 3);
      case 'yearly':
        return addYears(startDate, 1);
      default:
        return addMonths(startDate, 1);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Type validation
    if (!formData.type) {
      newErrors.type = 'Payment type is required';
    }

    // Amount validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    } else if (amount > 999999.99) {
      newErrors.amount = 'Amount cannot exceed $999,999.99';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 3) {
      newErrors.description = 'Description must be at least 3 characters';
    } else if (formData.description.trim().length > 255) {
      newErrors.description = 'Description cannot exceed 255 characters';
    }

    // Frequency validation
    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required';
    }

    // Start date validation
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    // End date validation
    if (formData.hasEndDate && formData.endDate) {
      if (formData.endDate <= formData.startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    // Category validation
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Clear category when type changes
    if (field === 'type') {
      setFormData(prev => ({ ...prev, categoryId: '' }));
    }

    // Clear end date when hasEndDate is disabled
    if (field === 'hasEndDate' && !value) {
      setFormData(prev => ({ ...prev, endDate: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const submitData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        frequency: formData.frequency,
        startDate: formData.startDate.toISOString(),
        endDate: formData.hasEndDate && formData.endDate ? formData.endDate.toISOString() : undefined,
        categoryId: formData.categoryId,
        vendorId: formData.type === 'expense' && formData.vendorId ? formData.vendorId : undefined,
        isActive: formData.isActive,
      };

      const url = recurringPayment
        ? `/api/finance/recurring/${recurringPayment._id}`
        : '/api/finance/recurring';

      const method = recurringPayment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.details) {
          // Handle validation errors from server
          const serverErrors: FormErrors = {};
          Object.keys(data.error.details).forEach(field => {
            serverErrors[field as keyof FormErrors] = data.error.details[field];
          });
          setErrors(serverErrors);
        } else {
          setErrors({ general: data.error?.message || 'Failed to save recurring payment' });
        }
        return;
      }

      onSuccess();
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCategories = () => {
    return formData.type === 'income' ? incomeCategories : expenseCategories;
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly (Every 3 months)',
      yearly: 'Yearly'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  if (categoriesLoading || vendorsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  const nextDueDate = calculateNextDueDate(formData.startDate, formData.frequency);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit}>
        {errors.general && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.general}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.type} required>
              <InputLabel>Payment Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                label="Payment Type"
              >
                <MenuItem value="income">Recurring Income</MenuItem>
                <MenuItem value="expense">Recurring Expense</MenuItem>
              </Select>
              {errors.type && (
                <FormHelperText>{errors.type}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              error={!!errors.amount}
              helperText={errors.amount}
              inputProps={{
                min: 0,
                step: 0.01,
                max: 999999.99
              }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description || `${formData.description.length}/255 characters`}
              inputProps={{ maxLength: 255 }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.frequency} required>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => handleInputChange('frequency', e.target.value)}
                label="Frequency"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
              {errors.frequency && (
                <FormHelperText>{errors.frequency}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Start Date"
              value={formData.startDate}
              onChange={(date) => handleInputChange('startDate', date)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  error={!!errors.startDate}
                  helperText={errors.startDate}
                  required
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.hasEndDate}
                  onChange={(e) => handleInputChange('hasEndDate', e.target.checked)}
                />
              }
              label="Set end date (optional)"
            />
          </Grid>

          {formData.hasEndDate && (
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date"
                value={formData.endDate}
                onChange={(date) => handleInputChange('endDate', date)}
                minDate={formData.startDate}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={!!errors.endDate}
                    helperText={errors.endDate}
                  />
                )}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={formData.type === 'expense' ? 6 : 12}>
            <FormControl fullWidth error={!!errors.categoryId} required>
              <InputLabel>{formData.type === 'income' ? 'Income' : 'Expense'} Category</InputLabel>
              <Select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                label={`${formData.type === 'income' ? 'Income' : 'Expense'} Category`}
              >
                {getCurrentCategories().length === 0 ? (
                  <MenuItem disabled>No categories available</MenuItem>
                ) : (
                  getCurrentCategories().map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                      {category.isDefault && (
                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          (Default)
                        </Typography>
                      )}
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.categoryId && (
                <FormHelperText>{errors.categoryId}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {formData.type === 'expense' && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.vendorId}>
                <InputLabel>Vendor (Optional)</InputLabel>
                <Select
                  value={formData.vendorId}
                  onChange={(e) => handleInputChange('vendorId', e.target.value)}
                  label="Vendor (Optional)"
                >
                  <MenuItem value="">
                    <em>No vendor selected</em>
                  </MenuItem>
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor._id} value={vendor._id}>
                      {vendor.name}
                      {vendor.email && (
                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          ({vendor.email})
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
                {errors.vendorId && (
                  <FormHelperText>{errors.vendorId}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
              }
              label="Active (payments will be processed automatically)"
            />
          </Grid>

          {/* Preview Card */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Payment Schedule Preview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Type:
                    </Typography>
                    <Chip
                      label={formData.type === 'income' ? 'Recurring Income' : 'Recurring Expense'}
                      color={formData.type === 'income' ? 'success' : 'error'}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Amount:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      ${parseFloat(formData.amount || '0').toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Frequency:
                    </Typography>
                    <Typography variant="body1">
                      {getFrequencyLabel(formData.frequency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Next Due Date:
                    </Typography>
                    <Typography variant="body1">
                      {nextDueDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Grid>
                  {formData.hasEndDate && formData.endDate && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        End Date:
                      </Typography>
                      <Typography variant="body1">
                        {formData.endDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Saving...' : (recurringPayment ? 'Update Payment' : 'Create Payment')}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default RecurringPaymentForm;