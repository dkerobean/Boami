"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import {
  Typography,
} from "@mui/material";
import { Grid } from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

interface PricingCardProps {
  productData?: any;
  onPriceChange?: (price: string) => void;
  onStockChange?: (stock: string) => void;
}

const PricingCard = ({ productData, onPriceChange, onStockChange }: PricingCardProps) => {

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>
        Pricing
      </Typography>

      <Grid container spacing={3}>
        {/* 1 */}
        <Grid item xs={12}>
          <CustomFormLabel htmlFor="p_price" sx={{ mt: 0 }}>
            Current Price{" "}
            <Typography color="error.main" component="span">
              *
            </Typography>
          </CustomFormLabel>
          <CustomTextField
            id="p_price"
            placeholder="Product Price"
            value={productData?.price || productData?.salesPrice || "0"}
            fullWidth
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPriceChange?.(e.target.value)}
          />
          <Typography variant="body2">
            Current selling price of the product.
          </Typography>
        </Grid>
        
        {productData?.regularPrice && productData.regularPrice !== productData.price && (
          <Grid item xs={12}>
            <CustomFormLabel htmlFor="p_regular" sx={{ mt: 0 }}>
              Regular Price
            </CustomFormLabel>
            <CustomTextField
              id="p_regular"
              placeholder="Regular Price"
              value={productData.regularPrice}
              fullWidth
              disabled
            />
            <Typography variant="body2">
              Original price before any discounts.
            </Typography>
          </Grid>
        )}
        
        <Grid item xs={12}>
          <CustomFormLabel htmlFor="p_stock" sx={{ mt: 0 }}>
            Stock Quantity
          </CustomFormLabel>
          <CustomTextField
            id="p_stock"
            placeholder="Stock Quantity"
            value={productData?.qty || "0"}
            fullWidth
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onStockChange?.(e.target.value)}
          />
          <Typography variant="body2">
            Available stock quantity.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PricingCard;
