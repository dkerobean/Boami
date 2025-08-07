"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Paper,
  IconButton,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tooltip,
} from "@mui/material";
import {
  IconPlus,
  IconTrash,
  IconPercentage,
  IconCurrencyDollar,
  IconTag,
  IconEdit,
} from "@tabler/icons-react";
import { InvoiceDiscount } from "@/app/(dashboard)/types/apps/invoice";

interface DiscountManagerProps {
  discounts: InvoiceDiscount[];
  onDiscountsChange: (discounts: InvoiceDiscount[]) => void;
  subtotal: number;
  currency?: string;
}

const DiscountManager: React.FC<DiscountManagerProps> = ({
  discounts,
  onDiscountsChange,
  subtotal,
  currency = "USD",
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<InvoiceDiscount>({
    type: "percentage",
    value: 0,
    reason: "",
    appliedTo: "subtotal",
  });

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      setFormData(discounts[index]);
    } else {
      setEditingIndex(null);
      setFormData({
        type: "percentage",
        value: 0,
        reason: "",
        appliedTo: "subtotal",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIndex(null);
    setFormData({
      type: "percentage",
      value: 0,
      reason: "",
      appliedTo: "subtotal",
    });
  };

  const handleSaveDiscount = () => {
    if (formData.value <= 0) return;

    const newDiscounts = [...discounts];
    if (editingIndex !== null) {
      newDiscounts[editingIndex] = formData;
    } else {
      newDiscounts.push(formData);
    }

    onDiscountsChange(newDiscounts);
    handleCloseDialog();
  };

  const handleRemoveDiscount = (index: number) => {
    const newDiscounts = discounts.filter((_, i) => i !== index);
    onDiscountsChange(newDiscounts);
  };

  const calculateDiscountAmount = (discount: InvoiceDiscount): number => {
    if (discount.type === "percentage") {
      return (subtotal * discount.value) / 100;
    } else {
      return discount.value;
    }
  };

  const getTotalDiscountAmount = (): number => {
    return discounts.reduce((total, discount) => {
      return total + calculateDiscountAmount(discount);
    }, 0);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Discounts</Typography>
        <Button
          startIcon={<IconPlus />}
          variant="outlined"
          size="small"
          onClick={() => handleOpenDialog()}
        >
          Add Discount
        </Button>
      </Stack>

      {discounts.length > 0 ? (
        <Stack spacing={2}>
          {discounts.map((discount, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box flex={1}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Chip
                      icon={discount.type === "percentage" ? <IconPercentage /> : <IconCurrencyDollar />}
                      label={`${discount.value}${discount.type === "percentage" ? "%" : ` ${currency}`}`}
                      color="primary"
                      variant="outlined"
                    />
                    {discount.reason && (
                      <Chip
                        icon={<IconTag />}
                        label={discount.reason}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Applied to: {discount.appliedTo.replace("_", " ")}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="primary.main" fontWeight={500} mt={1}>
                    Discount Amount: -{formatCurrency(calculateDiscountAmount(discount))}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Edit discount">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(index)}
                    >
                      <IconEdit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove discount">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveDiscount(index)}
                    >
                      <IconTrash />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          ))}
          
          {/* Total Discount Summary */}
          <Paper
            sx={{
              p: 2,
              bgcolor: "success.light",
              border: "1px solid",
              borderColor: "success.main",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" color="success.dark">
                Total Discount:
              </Typography>
              <Typography variant="h6" color="success.dark" fontWeight={700}>
                -{formatCurrency(getTotalDiscountAmount())}
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: "center",
            bgcolor: "grey.50",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No discounts applied. Click "Add Discount" to add one.
          </Typography>
        </Paper>
      )}

      {/* Add/Edit Discount Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? "Edit Discount" : "Add Discount"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Discount Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Discount Type"
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as "percentage" | "fixed" })
                  }
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="fixed">Fixed Amount ({currency})</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Discount Value"
                type="number"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {formData.type === "percentage" ? <IconPercentage /> : currency}
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  min: 0,
                  max: formData.type === "percentage" ? 100 : undefined,
                  step: formData.type === "percentage" ? 1 : 0.01,
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Apply To</InputLabel>
                <Select
                  value={formData.appliedTo}
                  label="Apply To"
                  onChange={(e) =>
                    setFormData({ ...formData, appliedTo: e.target.value as "line_item" | "subtotal" })
                  }
                >
                  <MenuItem value="subtotal">Subtotal</MenuItem>
                  <MenuItem value="line_item">Line Item</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason (Optional)"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Customer loyalty, Bulk order, Promotion code"
              />
            </Grid>
            
            {/* Preview */}
            {formData.value > 0 && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "primary.light" }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    Preview:
                  </Typography>
                  <Typography variant="body1">
                    {formData.type === "percentage"
                      ? `${formData.value}% discount = ${formatCurrency((subtotal * formData.value) / 100)}`
                      : `Fixed discount = ${formatCurrency(formData.value)}`
                    }
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveDiscount}
            variant="contained"
            disabled={formData.value <= 0}
          >
            {editingIndex !== null ? "Update" : "Add"} Discount
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscountManager;