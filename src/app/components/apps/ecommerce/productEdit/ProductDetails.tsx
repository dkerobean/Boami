"use client";
import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import { Autocomplete, Button, Grid, Typography, Chip, Alert, CircularProgress } from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconPlus } from "@tabler/icons-react";
import { 
  fetchProductCategories, 
  fetchProductTags, 
  formatCategoriesForAutocomplete, 
  formatTagsForAutocomplete,
  extractLabelsFromAutocomplete
} from "@/lib/utils/product-data";

interface ProductDetailsProps {
  productData?: any;
  onCategoriesChange?: (categories: string[]) => void;
  onTagsChange?: (tags: string[]) => void;
}

const ProductDetails = ({ productData, onCategoriesChange, onTagsChange }: ProductDetailsProps) => {
  const [availableCategories, setAvailableCategories] = useState<{ label: string }[]>([]);
  const [availableTags, setAvailableTags] = useState<{ label: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<{ label: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Load categories and tags on component mount
  useEffect(() => {
    loadCategoriesAndTags();
  }, []);

  // Update selected values when productData changes
  useEffect(() => {
    if (productData) {
      // Set selected categories
      if (productData.category) {
        const categories = Array.isArray(productData.category) 
          ? productData.category 
          : [productData.category];
        setSelectedCategories(formatCategoriesForAutocomplete(categories));
      }
      
      // Set selected tags
      if (productData.tags) {
        setSelectedTags(formatTagsForAutocomplete(productData.tags));
      }
    }
  }, [productData]);

  const loadCategoriesAndTags = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [categories, tags] = await Promise.all([
        fetchProductCategories(),
        fetchProductTags()
      ]);
      
      setAvailableCategories(formatCategoriesForAutocomplete(categories));
      setAvailableTags(formatTagsForAutocomplete(tags));
    } catch (err) {
      console.error('Error loading categories and tags:', err);
      setError('Failed to load categories and tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoriesChange = (event: any, newValue: { label: string }[]) => {
    setSelectedCategories(newValue);
    const categoryValues = extractLabelsFromAutocomplete(newValue);
    onCategoriesChange?.(categoryValues);
  };

  const handleTagsChange = (event: any, newValue: { label: string }[]) => {
    setSelectedTags(newValue);
    const tagValues = extractLabelsFromAutocomplete(newValue);
    onTagsChange?.(tagValues);
  };

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress size={24} />
        <Typography variant="body2" mt={1}>Loading categories and tags...</Typography>
      </Box>
    );
  }
  return (
    <Box p={3}>
      <Typography variant="h5">Product Details</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
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
            id="new-category"
            options={availableCategories}
            getOptionLabel={(option) => option.label}
            value={selectedCategories}
            onChange={handleCategoriesChange}
            filterSelectedOptions
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Categories" />
            )}
          />

          {/* <CustomTextField id="p_cat" fullWidth /> */}
          <Typography variant="body2" mb={2}>
            Add product to a category.
          </Typography>
        </Grid>
        {/* 1 */}
        <Grid item xs={12} display="flex" alignItems="center">
          <CustomFormLabel htmlFor="p_tag">Tags</CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            multiple
            fullWidth
            id="new-tags"
            options={availableTags}
            getOptionLabel={(option) => option.label}
            value={selectedTags}
            onChange={handleTagsChange}
            filterSelectedOptions
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Tags" />
            )}
          />
          {/* <CustomTextField id="p_tag" fullWidth /> */}
          <Typography variant="body2" mb={2}>
            Add product to a category.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductDetails;
