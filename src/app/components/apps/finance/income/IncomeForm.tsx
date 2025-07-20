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
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useToast } from '@/app/components/shared/ToastContext';

interface Income {
  _id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: {
    _id: string;
    name: string;
    isDefault: boolean;
  };
  saleId?: string;
  isRecurring: boolean;
}

interface IncomeCategory {
  _id: string;
  name: string;
  isDefault: boolean;
}

interface IncomeFormProps {
  income?: Income | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  amount: string;
  description: string;
  date: Date;
  categoryId: string;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
  categoryId?: string;
  general?: string;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ income, onSuccess, onCancel }) => {
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    amount: income?.amount.toString() || '',
    description: income?.description || '',
    date: income ? new Date(income.date) : new Date(),
    categoryId: income?.categoryId._id || '',
  });

  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch('/api/finance/categories/income', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data.data?.categories || []);
    } catch (err) {
      setErrors({ general: 'Failed to load categories' });
    } finally {
      setCategoriesLoading(false);
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
      };

      const url = income
        ? `/api/finance/income/${income._id}`
        : '/api/finance/income';

      const method = income ? 'PUT' : 'POST';

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
          setErrors({ general: data.error?.message || 'Failed to save income' });
        }
        return;
      }

      showToast({
        message: income ? 'Income updated successfully!' : 'Income created successfully!',
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

  if (categoriesLoading) {
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

          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.categoryId} required>
              <InputLabel>Income Category</InputLabel>
              <Select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                label="Income Category"
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

          {income?.saleId && (
            <Grid item xs={12}>
              <Alert severity="info">
                This income record was automatically generated from a sale transaction.
              </Alert>
            </Grid>
          )}

          {income?.isRecurring && (
            <Grid item xs={12}>
              <Alert severity="warning">
                This income record was automatically generated from a recurring payment.
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
            {loading ? 'Saving...' : (income ? 'Update Income' : 'Add Income')}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default IncomeForm;