"use client";
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Divider,
  Grid,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  IconReceipt,
  IconDiscount,
  IconCalculator,
  IconCurrencyDollar,
  IconInfoCircle,
} from "@tabler/icons-react";
import { 
  InvoiceItem, 
  InvoiceDiscount, 
  InvoiceTaxConfig 
} from "@/app/(dashboard)/types/apps/invoice";

interface PricingBreakdownProps {
  items: InvoiceItem[];
  discounts: InvoiceDiscount[];
  taxConfig: InvoiceTaxConfig;
  currency?: string;
  showDetails?: boolean;
}

const PricingBreakdown: React.FC<PricingBreakdownProps> = ({
  items,
  discounts,
  taxConfig,
  currency = "USD",
  showDetails = false,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Calculate subtotal (sum of all items before discounts and taxes)
  const subtotal = items.reduce((sum, item) => sum + item.unitTotalPrice, 0);

  // Calculate total discount amount
  const calculateDiscountAmount = (discount: InvoiceDiscount): number => {
    if (discount.type === "percentage") {
      return (subtotal * discount.value) / 100;
    } else {
      return discount.value;
    }
  };

  const totalDiscountAmount = discounts.reduce((sum, discount) => {
    return sum + calculateDiscountAmount(discount);
  }, 0);

  // Calculate subtotal after discounts
  const subtotalAfterDiscount = subtotal - totalDiscountAmount;

  // Calculate tax amount
  const calculateTaxForItem = (item: InvoiceItem): number => {
    const applicableTaxRates = taxConfig.rates.filter(rate =>
      rate.appliedTo.includes("all") || 
      rate.appliedTo.includes(item.productId || "")
    );

    const totalTaxRate = applicableTaxRates.reduce((sum, rate) => sum + rate.rate, 0);
    
    if (taxConfig.type === "inclusive") {
      return (item.unitTotalPrice * totalTaxRate) / (100 + totalTaxRate);
    } else {
      return (item.unitTotalPrice * totalTaxRate) / 100;
    }
  };

  const totalTaxAmount = items.reduce((sum, item) => {
    return sum + calculateTaxForItem(item);
  }, 0);

  // Calculate final total
  const grandTotal = taxConfig.type === "inclusive" 
    ? subtotalAfterDiscount 
    : subtotalAfterDiscount + totalTaxAmount;

  const getEffectiveTaxRate = (): number => {
    if (subtotal === 0) return 0;
    return (totalTaxAmount / subtotal) * 100;
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        bgcolor: "background.paper",
        borderRadius: 2,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} mb={3}>
        <IconReceipt />
        <Typography variant="h6">
          Pricing Breakdown
        </Typography>
        {showDetails && (
          <Tooltip title="Detailed pricing calculation">
            <IconInfoCircle size={16} />
          </Tooltip>
        )}
      </Stack>

      <Stack spacing={2}>
        {/* Items Subtotal */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body1">
            Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {formatCurrency(subtotal)}
          </Typography>
        </Box>

        {/* Detailed Items Breakdown */}
        {showDetails && items.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Typography variant="subtitle2" gutterBottom>
              Items Detail:
            </Typography>
            <Stack spacing={1}>
              {items.map((item, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {item.itemName} × {item.units}
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(item.unitTotalPrice)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Discounts */}
        {discounts.length > 0 && (
          <>
            <Stack spacing={1}>
              {discounts.map((discount, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Stack direction="row" alignItems="center" gap={1}>
                    <IconDiscount size={16} />
                    <Typography variant="body1" color="success.main">
                      {discount.reason || "Discount"}
                      {discount.type === "percentage" 
                        ? ` (${discount.value}%)`
                        : ` (${formatCurrency(discount.value)})`
                      }
                    </Typography>
                  </Stack>
                  <Typography variant="body1" color="success.main" fontWeight={500}>
                    -{formatCurrency(calculateDiscountAmount(discount))}
                  </Typography>
                </Box>
              ))}
            </Stack>
            
            {totalDiscountAmount > 0 && (
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                  Subtotal after discounts
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatCurrency(subtotalAfterDiscount)}
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Tax Information */}
        {taxConfig.rates.length > 0 && totalTaxAmount > 0 && (
          <>
            <Divider />
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" gap={1}>
                <IconCalculator size={16} />
                <Typography variant="body1">
                  Tax ({taxConfig.type === "inclusive" ? "included" : "added"})
                </Typography>
                <Chip
                  size="small"
                  label={`${getEffectiveTaxRate().toFixed(2)}%`}
                  variant="outlined"
                />
              </Stack>
              
              {showDetails && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tax Breakdown:
                  </Typography>
                  <Stack spacing={1}>
                    {taxConfig.rates.map((rate, index) => (
                      <Box
                        key={index}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body2" color="text.secondary">
                          {rate.name} ({rate.rate}%)
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency((subtotalAfterDiscount * rate.rate) / 100)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">
                  {taxConfig.type === "inclusive" ? "Tax amount (included)" : "Tax amount"}
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {taxConfig.type === "inclusive" ? "" : "+"}
                  {formatCurrency(totalTaxAmount)}
                </Typography>
              </Box>
            </Stack>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Grand Total */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            bgcolor: "primary.main",
            color: "white",
            p: 2,
            borderRadius: 1,
            mx: -3,
            mb: -3,
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <IconCurrencyDollar />
            <Typography variant="h6" fontWeight={700}>
              Grand Total
            </Typography>
          </Stack>
          <Typography variant="h6" fontWeight={700}>
            {formatCurrency(grandTotal)}
          </Typography>
        </Box>
      </Stack>

      {/* Additional Information */}
      {showDetails && (
        <Box mt={2} p={2} bgcolor="info.light" borderRadius={1}>
          <Typography variant="caption" color="info.dark">
            💡 All amounts are in {currency}. 
            {taxConfig.type === "inclusive" 
              ? " Taxes are included in the item prices." 
              : " Taxes are added to the subtotal."
            }
            {discounts.length > 0 && " Discounts are applied before tax calculation."}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PricingBreakdown;