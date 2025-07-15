"use client";
import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import {
  Typography,
  useTheme,
} from "@mui/material";
import { Grid } from "@mui/material";
import { useFormikContext } from "formik";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

const PricingCard = () => {
  const theme = useTheme();
  const { values, errors, touched, handleChange, handleBlur, setFieldValue } = useFormikContext<any>();

  // Auto-generate SKU when title or category changes (background only - hidden from user)
  useEffect(() => {
    if (values.title && values.category && values.category.length > 0) {
      generateSKU();
    }
  }, [values.title, values.category]);

  const generateSKU = async () => {
    if (!values.title || !values.category || values.category.length === 0) return;
    
    try {
      // Generate SKU on the client side using a simpler approach
      const categoryCode = values.category[0].substring(0, 3).toUpperCase();
      const titleCode = values.title
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .slice(0, 2)
        .map((word: string) => word.charAt(0).toUpperCase())
        .join('');
      const timestamp = Date.now().toString().slice(-4);
      const randomSuffix = Math.random().toString(36).substr(2, 2).toUpperCase();
      
      const generatedSKU = `${categoryCode}-${titleCode}-${timestamp}-${randomSuffix}`;
      setFieldValue("sku", generatedSKU);
    } catch (error) {
      console.error('Error generating SKU:', error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>
        Pricing
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <CustomFormLabel 
            htmlFor="price" 
            sx={{ mt: 0 }}
            error={touched.price && Boolean(errors.price)}
          >
            Price{" "}
            <Typography color="error.main" component="span" className="required-asterisk">
              *
            </Typography>
          </CustomFormLabel>
          <CustomTextField 
            id="price"
            name="price"
            type="number"
            placeholder="Product Price" 
            fullWidth 
            value={values.price}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.price && Boolean(errors.price)}
            helperText={touched.price && errors.price}
          />
          <Typography variant="body2">Set the product price.</Typography>
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <CustomFormLabel htmlFor="qty" sx={{ mt: 0 }}>
            Stock Quantity{" "}
            <Typography color="error.main" component="span">
              *
            </Typography>
          </CustomFormLabel>
          <CustomTextField 
            id="qty"
            name="qty"
            type="number"
            placeholder="Stock Quantity" 
            fullWidth 
            value={values.qty}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.qty && Boolean(errors.qty)}
            helperText={touched.qty && errors.qty}
          />
          <Typography variant="body2">Set the stock quantity.</Typography>
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <CustomFormLabel htmlFor="lowStockThreshold" sx={{ mt: 0 }}>
            Low Stock Threshold
          </CustomFormLabel>
          <CustomTextField 
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            placeholder="Low Stock Alert Level" 
            fullWidth 
            value={values.lowStockThreshold}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.lowStockThreshold && Boolean(errors.lowStockThreshold)}
            helperText={touched.lowStockThreshold && errors.lowStockThreshold}
          />
          <Typography variant="body2">Alert when stock falls below this level.</Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PricingCard;
