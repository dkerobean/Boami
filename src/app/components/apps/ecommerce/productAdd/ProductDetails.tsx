"use client";
import React from "react";
import Box from "@mui/material/Box";
import { Autocomplete, Button, Grid, Typography } from "@mui/material";
import { useFormikContext } from "formik";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconPlus } from "@tabler/icons-react";

const new_category = [
  { label: "Electronics" },
  { label: "Computers" },
  { label: "Audio" },
  { label: "Mobile" },
  { label: "Headphones" },
  { label: "Beauty" },
  { label: "Fashion" },
  { label: "Footwear" },
  { label: "Furniture" },
  { label: "Office" },
  { label: "Home & Garden" },
  { label: "Sports" },
];

const new_tags = [
  { label: "New" },
  { label: "Trending" },
  { label: "Featured" },
  { label: "Sale" },
  { label: "Best Seller" },
  { label: "Premium" },
  { label: "Limited Edition" },
  { label: "Eco-Friendly" },
];

const ProductDetails = () => {
  const { values, setFieldValue } = useFormikContext<any>();
  return (
    <Box p={3}>
      <Typography variant="h5">Product Details</Typography>
      <Grid container mt={3}>
        {/* 1 */}
        <Grid item xs={12} display="flex" alignItems="center">
          <CustomFormLabel htmlFor="p_cat" sx={{ mt: 0 }}>
            Categories
          </CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            multiple
            fullWidth
            id="category"
            options={new_category}
            getOptionLabel={(option) => option.label}
            value={values.category.map((cat: string) => ({ label: cat }))}
            onChange={(event, newValue) => {
              setFieldValue("category", newValue.map((option) => option.label));
            }}
            filterSelectedOptions
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Select Categories" />
            )}
          />
          <Typography variant="body2" mb={2}>
            Add product to categories for better organization.
          </Typography>
        </Grid>
        
        <Grid item xs={12}>
          <CustomFormLabel htmlFor="brand">Brand</CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <CustomTextField 
            id="brand"
            name="brand"
            placeholder="Product Brand" 
            fullWidth 
            value={values.brand}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue("brand", e.target.value)}
          />
          <Typography variant="body2" mb={2}>
            Enter the brand name for this product.
          </Typography>
        </Grid>
        
        <Grid item xs={12} display="flex" alignItems="center">
          <CustomFormLabel htmlFor="tags">Tags</CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            multiple
            fullWidth
            id="tags"
            options={new_tags}
            getOptionLabel={(option) => option.label}
            value={values.tags.map((tag: string) => ({ label: tag }))}
            onChange={(event, newValue) => {
              setFieldValue("tags", newValue.map((option) => option.label));
            }}
            filterSelectedOptions
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Select Tags" />
            )}
          />
          <Typography variant="body2" mb={2}>
            Add tags to help customers find this product.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductDetails;
