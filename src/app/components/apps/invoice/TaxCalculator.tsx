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
  Switch,
  FormControlLabel,
  Autocomplete,
} from "@mui/material";
import {
  IconPlus,
  IconTrash,
  IconPercentage,
  IconCalculator,
  IconEdit,
  IconInfoCircle,
} from "@tabler/icons-react";
import { InvoiceTaxConfig, InvoiceItem } from "@/app/(dashboard)/types/apps/invoice";

interface TaxCalculatorProps {
  taxConfig: InvoiceTaxConfig;
  onTaxConfigChange: (config: InvoiceTaxConfig) => void;
  invoiceItems: InvoiceItem[];
  subtotal: number;
  currency?: string;
}

// Common tax rates for quick selection
const commonTaxRates = [
  { name: "VAT (Standard)", rate: 20 },
  { name: "VAT (Reduced)", rate: 5 },
  { name: "Sales Tax (CA)", rate: 8.25 },
  { name: "Sales Tax (NY)", rate: 8 },
  { name: "Sales Tax (TX)", rate: 6.25 },
  { name: "GST (Canada)", rate: 5 },
  { name: "HST (Ontario)", rate: 13 },
  { name: "No Tax", rate: 0 },
];

const TaxCalculator: React.FC<TaxCalculatorProps> = ({
  taxConfig,
  onTaxConfigChange,
  invoiceItems,
  subtotal,
  currency = "USD",
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rate: 0,
    appliedTo: ["all"] as string[],
  });

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      const taxRate = taxConfig.rates[index];
      setFormData({
        name: taxRate.name,
        rate: taxRate.rate,
        appliedTo: taxRate.appliedTo,
      });
    } else {
      setEditingIndex(null);
      setFormData({
        name: "",
        rate: 0,
        appliedTo: ["all"],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIndex(null);
  };

  const handleSaveTaxRate = () => {
    if (!formData.name || formData.rate < 0) return;

    const newRates = [...taxConfig.rates];
    const newRate = {
      name: formData.name,
      rate: formData.rate,
      appliedTo: formData.appliedTo,
    };

    if (editingIndex !== null) {
      newRates[editingIndex] = newRate;
    } else {
      newRates.push(newRate);
    }

    onTaxConfigChange({
      ...taxConfig,
      rates: newRates,
    });
    handleCloseDialog();
  };

  const handleRemoveTaxRate = (index: number) => {
    const newRates = taxConfig.rates.filter((_, i) => i !== index);
    onTaxConfigChange({
      ...taxConfig,
      rates: newRates,
    });
  };

  const handleTaxTypeChange = (type: "inclusive" | "exclusive") => {
    onTaxConfigChange({
      ...taxConfig,
      type,
    });
  };

  const calculateTaxForItem = (item: InvoiceItem): number => {
    const applicableTaxRates = taxConfig.rates.filter(rate =>
      rate.appliedTo.includes("all") || 
      rate.appliedTo.includes(item.productId || "")
    );

    const totalTaxRate = applicableTaxRates.reduce((sum, rate) => sum + rate.rate, 0);
    
    if (taxConfig.type === "inclusive") {
      // Tax is included in the price
      return (item.unitTotalPrice * totalTaxRate) / (100 + totalTaxRate);
    } else {
      // Tax is added to the price
      return (item.unitTotalPrice * totalTaxRate) / 100;
    }
  };

  const getTotalTaxAmount = (): number => {
    return invoiceItems.reduce((total, item) => {
      return total + calculateTaxForItem(item);
    }, 0);
  };

  const getEffectiveTaxRate = (): number => {
    if (subtotal === 0) return 0;
    return (getTotalTaxAmount() / subtotal) * 100;
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
        <Typography variant="h6">Tax Configuration</Typography>
        <Button
          startIcon={<IconPlus />}
          variant="outlined"
          size="small"
          onClick={() => handleOpenDialog()}
        >
          Add Tax Rate
        </Button>
      </Stack>

      {/* Tax Type Selection */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Tax Calculation Method
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose how taxes are calculated
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tax Type</InputLabel>
            <Select
              value={taxConfig.type}
              label="Tax Type"
              onChange={(e) => handleTaxTypeChange(e.target.value as "inclusive" | "exclusive")}
            >
              <MenuItem value="exclusive">Tax Exclusive</MenuItem>
              <MenuItem value="inclusive">Tax Inclusive</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        
        <Box mt={2} p={2} bgcolor="info.light" borderRadius={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconInfoCircle size={16} />
            <Typography variant="caption">
              {taxConfig.type === "exclusive" 
                ? "Tax will be added to the item prices" 
                : "Tax is already included in the item prices"
              }
            </Typography>
          </Stack>
        </Box>
      </Paper>

      {/* Tax Rates List */}
      {taxConfig.rates.length > 0 ? (
        <Stack spacing={2}>
          {taxConfig.rates.map((rate, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box flex={1}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Chip
                      icon={<IconPercentage />}
                      label={`${rate.name}: ${rate.rate}%`}
                      color="primary"
                      variant="outlined"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Applied to: {rate.appliedTo.includes("all") ? "All items" : `${rate.appliedTo.length} specific items`}
                    </Typography>
                  </Stack>
                </Box>
                
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Edit tax rate">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(index)}
                    >
                      <IconEdit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove tax rate">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveTaxRate(index)}
                    >
                      <IconTrash />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          ))}
          
          {/* Tax Summary */}
          <Paper
            sx={{
              p: 2,
              bgcolor: "primary.light",
              border: "1px solid",
              borderColor: "primary.main",
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Tax Amount:
                </Typography>
                <Typography variant="h6" color="primary.dark">
                  {formatCurrency(getTotalTaxAmount())}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Effective Tax Rate:
                </Typography>
                <Typography variant="h6" color="primary.dark">
                  {getEffectiveTaxRate().toFixed(2)}%
                </Typography>
              </Grid>
            </Grid>
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
            No tax rates configured. Click "Add Tax Rate" to add one.
          </Typography>
        </Paper>
      )}

      {/* Add/Edit Tax Rate Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? "Edit Tax Rate" : "Add Tax Rate"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={commonTaxRates}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                value={formData.name}
                onChange={(_, value) => {
                  if (typeof value === 'object' && value) {
                    setFormData({
                      ...formData,
                      name: value.name,
                      rate: value.rate,
                    });
                  } else if (typeof value === 'string') {
                    setFormData({ ...formData, name: value });
                  }
                }}
                onInputChange={(_, value) => {
                  setFormData({ ...formData, name: value });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tax Name"
                    placeholder="e.g., VAT, Sales Tax, GST"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tax Rate"
                type="number"
                value={formData.rate}
                onChange={(e) =>
                  setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconPercentage />
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  min: 0,
                  max: 100,
                  step: 0.01,
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Apply To</InputLabel>
                <Select
                  value={formData.appliedTo.includes("all") ? "all" : "specific"}
                  label="Apply To"
                  onChange={(e) => {
                    if (e.target.value === "all") {
                      setFormData({ ...formData, appliedTo: ["all"] });
                    } else {
                      setFormData({ ...formData, appliedTo: [] });
                    }
                  }}
                >
                  <MenuItem value="all">All Items</MenuItem>
                  <MenuItem value="specific">Specific Items</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Item Selection for Specific Application */}
            {!formData.appliedTo.includes("all") && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Select items to apply this tax rate to:
                </Typography>
                <Stack spacing={1}>
                  {invoiceItems.map((item, index) => (
                    <FormControlLabel
                      key={index}
                      control={
                        <Switch
                          checked={formData.appliedTo.includes(item.productId || `item-${index}`)}
                          onChange={(e) => {
                            const itemId = item.productId || `item-${index}`;
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                appliedTo: [...formData.appliedTo, itemId],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                appliedTo: formData.appliedTo.filter(id => id !== itemId),
                              });
                            }
                          }}
                        />
                      }
                      label={item.itemName}
                    />
                  ))}
                </Stack>
              </Grid>
            )}
            
            {/* Preview */}
            {formData.rate > 0 && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "primary.light" }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    Preview:
                  </Typography>
                  <Typography variant="body1">
                    {formData.rate}% tax = approximately {formatCurrency((subtotal * formData.rate) / 100)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    *Actual amount may vary based on item-specific application
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveTaxRate}
            variant="contained"
            disabled={!formData.name || formData.rate < 0}
          >
            {editingIndex !== null ? "Update" : "Add"} Tax Rate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaxCalculator;