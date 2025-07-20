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
  Divider
} from '@mui/material';

interface Vendor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
}

interface VendorFormProps {
  vendor?: Vendor | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  contactPerson: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
  general?: string;
}

const VendorForm: React.FC<VendorFormProps> = ({ vendor, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    name: vendor?.name || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || '',
    website: vendor?.website || '',
    contactPerson: vendor?.contactPerson || '',
    notes: vendor?.notes || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = 'Vendor name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Vendor name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Vendor name cannot exceed 100 characters';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      } else if (formData.email.trim().length > 100) {
        newErrors.email = 'Email cannot exceed 100 characters';
      }
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.phone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone.trim().replace(/[\s\-\(\)]/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number';
      } else if (formData.phone.trim().length > 20) {
        newErrors.phone = 'Phone number cannot exceed 20 characters';
      }
    }

    // Address validation (optional)
    if (formData.address && formData.address.length > 200) {
      newErrors.address = 'Address cannot exceed 200 characters';
    }

    // Website validation (optional but must be valid if provided)
    if (formData.website.trim()) {
      try {
        new URL(formData.website.trim());
        if (formData.website.trim().length > 100) {
          newErrors.website = 'Website URL cannot exceed 100 characters';
        }
      } catch {
        newErrors.website = 'Please enter a valid website URL (include http:// or https://)';
      }
    }

    // Contact person validation (optional)
    if (formData.contactPerson && formData.contactPerson.length > 100) {
      newErrors.contactPerson = 'Contact person name cannot exceed 100 characters';
    }

    // Notes validation (optional)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
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
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        website: formData.website.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      const url = vendor
        ? `/api/finance/vendors/${vendor._id}`
        : '/api/finance/vendors';

      const method = vendor ? 'PUT' : 'POST';

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
          setErrors({ general: data.error?.message || 'Failed to save vendor' });
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

  return (
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
            label="Vendor Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || `${formData.name.length}/100 characters`}
            inputProps={{ maxLength: 100 }}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Contact Person"
            value={formData.contactPerson}
            onChange={(e) => handleInputChange('contactPerson', e.target.value)}
            error={!!errors.contactPerson}
            helperText={errors.contactPerson || `${formData.contactPerson.length}/100 characters`}
            inputProps={{ maxLength: 100 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email || `${formData.email.length}/100 characters`}
            inputProps={{ maxLength: 100 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            error={!!errors.phone}
            helperText={errors.phone || `${formData.phone.length}/20 characters`}
            inputProps={{ maxLength: 20 }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address"
            multiline
            rows={2}
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            error={!!errors.address}
            helperText={errors.address || `${formData.address.length}/200 characters`}
            inputProps={{ maxLength: 200 }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Website"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            error={!!errors.website}
            helperText={errors.website || `${formData.website.length}/100 characters (include http:// or https://)`}
            inputProps={{ maxLength: 100 }}
            placeholder="https://example.com"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            error={!!errors.notes}
            helperText={errors.notes || `${formData.notes.length}/500 characters`}
            inputProps={{ maxLength: 500 }}
          />
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
          {loading ? 'Saving...' : (vendor ? 'Update Vendor' : 'Create Vendor')}
        </Button>
      </Box>
    </Box>
  );
};

export default VendorForm;