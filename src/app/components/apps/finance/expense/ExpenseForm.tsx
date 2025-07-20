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
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useToast } from '@/app/components/shared/ToastContext';

interface Expense {
  _id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: {
    _id: string;
    name: string;
    isDefault: boolean;
  };
  vendorId?: {
    _id: string;
    name: string;
    email?: string;
  };
  isRecurring: boolean;
}

interface ExpenseCategory {
  _id: string;
  name: string;
  isDefault: boolean;
}

interface Vendor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  amount: string;
  description: string;
  date: Date;
  categoryId: string;
  vendorId: string;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
  categoryId?: string;
  vendorId?: string;
  general?: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSuccess, onCancel }) => {
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    amount: expense?.amount.toString() || '',
    description: expense?.description || '',
    date: expense ? new Date(expense.date) : new Date(),
    categoryId: expense?.categoryId._id || '',
    vendorId: expense?.vendorId?._id || '',
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
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
      const response = await fetch('/api/finance/categories/expense', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data.data?.categories || []);
    } catch (err) {
      setErrors(prev => ({ ...prev, general: 'Failed to load categories' }));
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      const response = await fetch('/api/finance/vendors', {
        credentials: 'include',
      });
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else if (formData.date > new Date()) {
      newErrors.date = 'Date cannot be in the future';
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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        date: formData.date.toISOString(),
        categoryId: formData.categoryId,
        vendorId: formData.vendorId || undefined,
      };

      const url = expense
        ? `/api/finance/expenses/${expense._id}`
        : '/api/finance/expenses';

      const method = expense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
          setErrors({ general: data.error?.message || 'Failed to save expense' });
        }
        return;
      }

      showToast({
        message: expense ? 'Expense updated successfully!' : 'Expense created successfully!',
        severity: 'success'
      });
      
      onSuccess();
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  if (categoriesLoading || vendorsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

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

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={(date) => handleInputChange('date', date)}
              maxDate={new Date()}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  error={!!errors.date}
                  helperText={errors.date}
                  required
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description || `${formData.description.length}/255 characters`}
              inputProps={{ maxLength: 255 }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.categoryId} required>
              <InputLabel>Expense Category</InputLabel>
              <Select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                label="Expense Category"
              >
                {categories.length === 0 ? (
                  <MenuItem disabled>No categories available</MenuItem>
                ) : (
                  categories.map((category) => (
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

          {expense?.isRecurring && (
            <Grid item xs={12}>
              <Alert severity="warning">
                This expense record was automatically generated from a recurring payment.
              </Alert>
            </Grid>
          )}
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
            {loading ? 'Saving...' : (expense ? 'Update Expense' : 'Add Expense')}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default ExpenseForm;