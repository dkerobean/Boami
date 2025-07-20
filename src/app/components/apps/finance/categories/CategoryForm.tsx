'use client';

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { useToast } from '@/app/components/shared/ToastContext';

interface Category {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  type: 'income' | 'expense';
}

interface CategoryFormProps {
  category?: Category | null;
  type: 'income' | 'expense';
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  type: 'income' | 'expense';
}

interface FormErrors {
  name?: string;
  description?: string;
  type?: string;
  general?: string;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, type, onSuccess, onCancel }) => {
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    name: category?.name || '',
    description: category?.description || '',
    type: category?.type || type,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Category name cannot exceed 50 characters';
    }

    // Description validation (optional)
    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description cannot exceed 200 characters';
    }

    // Type validation
    if (!formData.type) {
      newErrors.type = 'Category type is required';
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
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
      };

      const url = category
        ? `/api/finance/categories/${formData.type}/${category._id}`
        : `/api/finance/categories/${formData.type}`;

      const method = category ? 'PUT' : 'POST';

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
          setErrors({ general: data.error?.message || 'Failed to save category' });
        }
        return;
      }
      
      showToast({
        message: category ? 'Category updated successfully!' : 'Category created successfully!',
        severity: 'success'
      });

      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrors({
        general: errorMessage
      });
      showToast({
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {errors.general && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.general}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Category Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || `${formData.name.length}/50 characters`}
            inputProps={{ maxLength: 50 }}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.type} required>
            <InputLabel>Category Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              label="Category Type"
              disabled={!!category} // Disable editing type for existing categories
            >
              <MenuItem value="income">Income Category</MenuItem>
              <MenuItem value="expense">Expense Category</MenuItem>
            </Select>
            {errors.type && (
              <FormHelperText>{errors.type}</FormHelperText>
            )}
            {category && (
              <FormHelperText>
                Category type cannot be changed after creation
              </FormHelperText>
            )}
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description (Optional)"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={!!errors.description}
            helperText={errors.description || `${formData.description.length}/200 characters`}
            inputProps={{ maxLength: 200 }}
          />
        </Grid>

        {category?.isDefault && (
          <Grid item xs={12}>
            <Alert severity="info">
              This is a default system category. You can edit the name and description, but it cannot be deleted.
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
          {loading ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
        </Button>
      </Box>
    </Box>
  );
};

export default CategoryForm;