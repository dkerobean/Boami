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
  Autocomplete,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';

interface Sale {
  _id: string;
  productId: {
    _id: string;
    title: string;
    price: number;
    qty: number;
    sku?: string;
  };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
  notes?: string;
}

interface Product {
  _id: string;
  title: string;
  price: number;
  qty: number;
  sku?: string;
  manageStock: boolean;
  stockStatus: string;
}

interface SaleFormProps {
  sale?: Sale | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  productId: string;
  quantity: string;
  unitPrice: string;
  date: Date;
  notes: string;
}

interface FormErrors {
  productId?: string;
  quantity?: string;
  unitPrice?: string;
  date?: string;
  notes?: string;
  general?: string;
}

interface StockValidation {
  isValid: boolean;
  message: string;
  availableQuantity: number;
}

const SaleForm: React.FC<SaleFormProps> = ({ sale, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    productId: sale?.productId._id || '',
    quantity: sale?.quantity.toString() || '1',
    unitPrice: sale?.unitPrice.toString() || '',
    date: sale ? new Date(sale.date) : new Date(),
    notes: sale?.notes || '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockValidation, setStockValidation] = useState<StockValidation | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [validatingStock, setValidatingStock] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct && formData.quantity) {
      validateStock();
    }
  }, [selectedProduct, formData.quantity]);

  useEffect(() => {
    // Auto-fill unit price when product is selected
    if (selectedProduct && !sale) {
      setFormData(prev => ({
        ...prev,
        unitPrice: selectedProduct.price.toString()
      }));
    }
  }, [selectedProduct, sale]);

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await fetch('/api/products?status=active');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setErrors({ general: 'Failed to load products' });
    } finally {
      setProductsLoading(false);
    }
  };

  const validateStock = async () => {
    if (!selectedProduct || !formData.quantity) {
      setStockValidation(null);
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setStockValidation(null);
      return;
    }

    try {
      setValidatingStock(true);

      // If product doesn't manage stock, always valid
      if (!selectedProduct.manageStock) {
        setStockValidation({
          isValid: true,
          message: 'Stock management disabled for this product',
          availableQuantity: Infinity
        });
        return;
      }

      // Check if sufficient stock is available
      const isValid = selectedProduct.qty >= quantity;

      setStockValidation({
        isValid,
        message: isValid
          ? `${selectedProduct.qty} units available`
          : `Insufficient stock. Only ${selectedProduct.qty} units available`,
        availableQuantity: selectedProduct.qty
      });

    } catch (err) {
      setStockValidation({
        isValid: false,
        message: 'Error validating stock',
        availableQuantity: 0
      });
    } finally {
      setValidatingStock(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Product validation
    if (!formData.productId) {
      newErrors.productId = 'Product is required';
    }

    // Quantity validation
    const quantity = parseInt(formData.quantity);
    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    } else if (quantity > 10000) {
      newErrors.quantity = 'Quantity cannot exceed 10,000';
    }

    // Unit price validation
    const unitPrice = parseFloat(formData.unitPrice);
    if (!formData.unitPrice.trim()) {
      newErrors.unitPrice = 'Unit price is required';
    } else if (isNaN(unitPrice) || unitPrice <= 0) {
      newErrors.unitPrice = 'Unit price must be a positive number';
    } else if (unitPrice > 999999.99) {
      newErrors.unitPrice = 'Unit price cannot exceed $999,999.99';
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else if (formData.date > new Date()) {
      newErrors.date = 'Date cannot be in the future';
    }

    // Notes validation (optional)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
    }

    // Stock validation
    if (stockValidation && !stockValidation.isValid) {
      newErrors.quantity = stockValidation.message;
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

  const handleProductChange = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      handleInputChange('productId', product._id);
      if (!sale) {
        handleInputChange('unitPrice', product.price.toString());
      }
    } else {
      handleInputChange('productId', '');
      handleInputChange('unitPrice', '');
    }
    setStockValidation(null);
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
        productId: formData.productId,
        quantity: parseInt(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        date: formData.date.toISOString(),
        notes: formData.notes.trim() || undefined,
      };

      const url = sale
        ? `/api/finance/sales/${sale._id}`
        : '/api/finance/sales';

      const method = sale ? 'PUT' : 'POST';

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
          setErrors({ general: data.error?.message || 'Failed to save sale' });
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

  const calculateTotal = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    return quantity * unitPrice;
  };

  if (productsLoading) {
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
          <Grid item xs={12}>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => `${option.title} ${option.sku ? `(${option.sku})` : ''}`}
              value={selectedProduct}
              onChange={(_, newValue) => handleProductChange(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product"
                  error={!!errors.productId}
                  helperText={errors.productId}
                  required
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.sku && `SKU: ${option.sku} • `}
                      Price: ${option.price.toFixed(2)}
                      {option.manageStock && ` • Stock: ${option.qty}`}
                    </Typography>
                  </Box>
                  <Chip
                    label={option.stockStatus}
                    size="small"
                    color={option.stockStatus === 'instock' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </Box>
              )}
              isOptionEqualToValue={(option, value) => option._id === value._id}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              error={!!errors.quantity}
              helperText={errors.quantity}
              inputProps={{
                min: 1,
                max: 10000
              }}
              required
            />

            {/* Stock validation indicator */}
            {validatingStock && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="caption">Checking stock...</Typography>
              </Box>
            )}

            {stockValidation && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                {stockValidation.isValid ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconAlertTriangle size={16} color="orange" />
                )}
                <Typography
                  variant="caption"
                  color={stockValidation.isValid ? 'success.main' : 'warning.main'}
                  sx={{ ml: 0.5 }}
                >
                  {stockValidation.message}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Unit Price"
              type="number"
              value={formData.unitPrice}
              onChange={(e) => handleInputChange('unitPrice', e.target.value)}
              error={!!errors.unitPrice}
              helperText={errors.unitPrice}
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

          <Grid item xs={12} sm={4}>
            <DatePicker
              label="Sale Date"
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
              label="Notes (Optional)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              error={!!errors.notes}
              helperText={errors.notes || `${formData.notes.length}/500 characters`}
              inputProps={{ maxLength: 500 }}
            />
          </Grid>

          {/* Total calculation */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary">
                  Sale Summary
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Quantity:
                      </Typography>
                      <Typography variant="body1">
                        {formData.quantity || 0} units
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Unit Price:
                      </Typography>
                      <Typography variant="body1">
                        ${parseFloat(formData.unitPrice || '0').toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" color="primary">
                        Total Amount: ${calculateTotal().toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
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
            disabled={loading || (stockValidation ? !stockValidation.isValid : false)}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Saving...' : (sale ? 'Update Sale' : 'Record Sale')}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default SaleForm;