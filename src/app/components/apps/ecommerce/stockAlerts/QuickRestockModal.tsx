'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  IconPackage,
  IconPlus,
  IconTruck,
  IconCheck,
} from '@tabler/icons-react';

interface StockAlert {
  id?: string;
  _id?: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  alertType: string;
  priority: string;
}

interface QuickRestockModalProps {
  open: boolean;
  onClose: () => void;
  alert: StockAlert | null;
  onRestock: (alertId: string, quantity: number, reason: string) => Promise<boolean>;
}

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

const RESTOCK_REASONS = [
  { value: 'emergency_restock', label: 'Emergency Restock' },
  { value: 'supplier_delivery', label: 'Supplier Delivery' },
  { value: 'inventory_adjustment', label: 'Inventory Adjustment' },
  { value: 'stock_transfer', label: 'Stock Transfer' },
  { value: 'returned_goods', label: 'Returned Goods' },
  { value: 'production_complete', label: 'Production Complete' },
  { value: 'custom', label: 'Custom Reason' },
];

const QuickRestockModal: React.FC<QuickRestockModalProps> = ({
  open,
  onClose,
  alert,
  onRestock,
}) => {
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>('emergency_restock');
  const [customReason, setCustomReason] = useState<string>('');
  const [resolveAlert, setResolveAlert] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleQuickAmount = (amount: number) => {
    setQuantity(amount);
  };

  const handleSubmit = async () => {
    if (!alert || quantity <= 0) return;

    const alertId = alert.id || alert._id;
    if (!alertId) {
      setError('Alert ID is missing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const finalReason = reason === 'custom' ? customReason : 
        RESTOCK_REASONS.find(r => r.value === reason)?.label || reason;

      const success = await onRestock(
        alertId,
        quantity,
        finalReason
      );

      if (success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError('Failed to update stock. Please try again.');
      }
    } catch (error) {
      console.error('Error restocking:', error);
      setError(error instanceof Error ? error.message : 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity(0);
    setReason('emergency_restock');
    setCustomReason('');
    setResolveAlert(true);
    setLoading(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const getRecommendedQuantity = () => {
    if (!alert) return 0;
    const deficit = Math.max(0, alert.threshold - alert.currentStock);
    const buffer = Math.ceil(alert.threshold * 0.2); // 20% buffer
    return deficit + buffer;
  };

  const getNewStockLevel = () => {
    if (!alert) return 0;
    return alert.currentStock + quantity;
  };

  const isStockSufficient = () => {
    return getNewStockLevel() > (alert?.threshold || 0);
  };

  if (!alert) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <IconPackage size={24} />
          <Box>
            <Typography variant="h6">Quick Restock</Typography>
            <Typography variant="body2" color="text.secondary">
              {alert.productName} (SKU: {alert.sku})
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<IconCheck />}>
            Stock updated successfully! Current stock: {getNewStockLevel()} units
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Current Stock Info */}
          <Grid item xs={12}>
            <Box 
              p={2} 
              bgcolor="background.paper" 
              borderRadius={1}
              border={1}
              borderColor="divider"
            >
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Current Stock
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {alert.currentStock} units
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Threshold
                  </Typography>
                  <Typography variant="h6">
                    {alert.threshold} units
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    After Restock
                  </Typography>
                  <Typography 
                    variant="h6" 
                    color={isStockSufficient() ? "success.main" : "warning.main"}
                  >
                    {getNewStockLevel()} units
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Quick Amount Buttons */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Amounts
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {QUICK_AMOUNTS.map((amount) => (
                <Chip
                  key={amount}
                  label={`+${amount}`}
                  onClick={() => handleQuickAmount(amount)}
                  color={quantity === amount ? "primary" : "default"}
                  clickable
                  icon={<IconPlus size={16} />}
                />
              ))}
              <Chip
                label={`Recommended: +${getRecommendedQuantity()}`}
                onClick={() => handleQuickAmount(getRecommendedQuantity())}
                color={quantity === getRecommendedQuantity() ? "primary" : "default"}
                clickable
                variant="outlined"
              />
            </Box>
          </Grid>

          {/* Custom Quantity */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity to Add"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconPlus size={18} />
                  </InputAdornment>
                ),
              }}
              error={quantity <= 0}
              helperText={quantity <= 0 ? "Quantity must be greater than 0" : ""}
            />
          </Grid>

          {/* Reason */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Reason</InputLabel>
              <Select
                value={reason}
                label="Reason"
                onChange={(e) => setReason(e.target.value)}
              >
                {RESTOCK_REASONS.map((reasonOption) => (
                  <MenuItem key={reasonOption.value} value={reasonOption.value}>
                    {reasonOption.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Custom Reason Input */}
          {reason === 'custom' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Custom Reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific reason for restocking..."
                multiline
                rows={2}
              />
            </Grid>
          )}

          {/* Summary */}
          <Grid item xs={12}>
            <Box 
              p={2} 
              bgcolor={isStockSufficient() ? "success.light" : "warning.light"}
              borderRadius={1}
            >
              <Typography variant="subtitle2" gutterBottom>
                Restock Summary
              </Typography>
              <Typography variant="body2">
                Adding <strong>{quantity} units</strong> will bring stock to <strong>{getNewStockLevel()} units</strong>
                {isStockSufficient() ? (
                  <span style={{ color: 'green' }}> ✓ Above threshold</span>
                ) : (
                  <span style={{ color: 'orange' }}> ⚠ Still below threshold</span>
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || quantity <= 0 || success}
          startIcon={loading ? <CircularProgress size={16} /> : <IconTruck />}
        >
          {loading ? 'Updating Stock...' : `Add ${quantity} Units`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickRestockModal;