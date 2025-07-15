"use client";
import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import { Button, Grid, Tooltip, MenuItem, Paper, Chip, Stack, Alert, CircularProgress } from "@mui/material";
import { Typography } from "@mui/material";

import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconX, IconPlus, IconEdit, IconPackage } from "@tabler/icons-react";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import { fetchProductVariations } from "@/lib/utils/product-data";

interface ProductVariation {
  _id: string;
  sku: string;
  attributes: { name: string; value: string }[];
  pricing: { price: number; compareAtPrice?: number };
  inventory: { quantity: number; available: number };
  status: 'active' | 'inactive';
  isDefault: boolean;
}

interface VariationCardProps {
  productData?: any;
  onVariationsChange?: (variations: ProductVariation[]) => void;
}

const VariationCard = ({ productData, onVariationsChange }: VariationCardProps) => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [editingVariation, setEditingVariation] = useState<string | null>(null);

  // Load variations when component mounts or productData changes
  useEffect(() => {
    if (productData?._id) {
      loadVariations();
    }
  }, [productData?._id]);

  const loadVariations = async () => {
    if (!productData?._id) return;
    
    try {
      setLoading(true);
      setError("");
      
      // For now, display variations from productData if available
      // In a real implementation, you'd fetch from ProductVariant collection
      if (productData.variations && productData.variations.length > 0) {
        setVariations(productData.variations);
      } else {
        // Create a default "no variations" state
        setVariations([]);
      }
    } catch (err) {
      console.error('Error loading variations:', err);
      setError('Failed to load product variations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariation = () => {
    const newVariation: ProductVariation = {
      _id: `temp_${Date.now()}`,
      sku: `${productData?.sku || 'SKU'}-VAR-${variations.length + 1}`,
      attributes: [{ name: 'Size', value: '' }],
      pricing: { price: productData?.price || 0 },
      inventory: { quantity: 0, available: 0 },
      status: 'active',
      isDefault: variations.length === 0
    };
    
    const updatedVariations = [...variations, newVariation];
    setVariations(updatedVariations);
    onVariationsChange?.(updatedVariations);
    setEditingVariation(newVariation._id);
  };

  const handleDeleteVariation = (variationId: string) => {
    const updatedVariations = variations.filter(v => v._id !== variationId);
    setVariations(updatedVariations);
    onVariationsChange?.(updatedVariations);
  };

  const handleUpdateVariation = (variationId: string, field: string, value: any) => {
    const updatedVariations = variations.map(variation => {
      if (variation._id === variationId) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          const parentValue = variation[parent as keyof ProductVariation];
          return {
            ...variation,
            [parent]: { ...(parentValue && typeof parentValue === 'object' ? parentValue : {}), [child]: value }
          };
        }
        return { ...variation, [field]: value };
      }
      return variation;
    });
    setVariations(updatedVariations);
    onVariationsChange?.(updatedVariations);
  };

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress size={24} />
        <Typography variant="body2" mt={1}>Loading variations...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>Product Variations</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {variations.length === 0 ? (
        <Box textAlign="center" py={4}>
          <IconPackage size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Variations Yet
          </Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>
            Add variations like size, color, or material to this product.
          </Typography>
          <Button variant="outlined" startIcon={<IconPlus size={18} />} onClick={handleAddVariation}>
            Add First Variation
          </Button>
        </Box>
      ) : (
        <Stack spacing={3}>
          {variations.map((variation) => (
            <Paper key={variation._id} sx={{ p: 3, border: variation.isDefault ? '2px solid' : '1px solid', borderColor: variation.isDefault ? 'primary.main' : 'divider' }}>
              <Grid container spacing={3} alignItems="center">
                {/* SKU and Default Badge */}
                <Grid item xs={12}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {variation.sku}
                    </Typography>
                    {variation.isDefault && (
                      <Chip label="Default" color="primary" size="small" />
                    )}
                    <Chip 
                      label={variation.status} 
                      color={variation.status === 'active' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </Stack>
                </Grid>
                
                {/* Attributes */}
                <Grid item xs={12} sm={6}>
                  <CustomFormLabel>Attributes</CustomFormLabel>
                  <Stack spacing={1}>
                    {variation.attributes.map((attr, index) => (
                      <Grid container spacing={1} key={index}>
                        <Grid item xs={5}>
                          <CustomTextField
                            placeholder="Attribute"
                            value={attr.name}
                            size="small"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const newAttributes = [...variation.attributes];
                              newAttributes[index] = { ...attr, name: e.target.value };
                              handleUpdateVariation(variation._id, 'attributes', newAttributes);
                            }}
                          />
                        </Grid>
                        <Grid item xs={5}>
                          <CustomTextField
                            placeholder="Value"
                            value={attr.value}
                            size="small"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const newAttributes = [...variation.attributes];
                              newAttributes[index] = { ...attr, value: e.target.value };
                              handleUpdateVariation(variation._id, 'attributes', newAttributes);
                            }}
                          />
                        </Grid>
                        <Grid item xs={2}>
                          {variation.attributes.length > 1 && (
                            <Button 
                              size="small" 
                              color="error"
                              onClick={() => {
                                const newAttributes = variation.attributes.filter((_, i) => i !== index);
                                handleUpdateVariation(variation._id, 'attributes', newAttributes);
                              }}
                            >
                              <IconX size={16} />
                            </Button>
                          )}
                        </Grid>
                      </Grid>
                    ))}
                    <Button 
                      size="small" 
                      variant="text" 
                      startIcon={<IconPlus size={16} />}
                      onClick={() => {
                        const newAttributes = [...variation.attributes, { name: '', value: '' }];
                        handleUpdateVariation(variation._id, 'attributes', newAttributes);
                      }}
                    >
                      Add Attribute
                    </Button>
                  </Stack>
                </Grid>
                
                {/* Pricing */}
                <Grid item xs={12} sm={3}>
                  <CustomFormLabel>Price</CustomFormLabel>
                  <CustomTextField
                    type="number"
                    placeholder="Price"
                    value={variation.pricing.price}
                    size="small"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateVariation(variation._id, 'pricing.price', parseFloat(e.target.value) || 0)}
                  />
                  {variation.pricing.compareAtPrice && (
                    <CustomTextField
                      type="number"
                      placeholder="Compare Price"
                      value={variation.pricing.compareAtPrice}
                      size="small"
                      sx={{ mt: 1 }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateVariation(variation._id, 'pricing.compareAtPrice', parseFloat(e.target.value) || 0)}
                    />
                  )}
                </Grid>
                
                {/* Inventory */}
                <Grid item xs={12} sm={2}>
                  <CustomFormLabel>Stock</CustomFormLabel>
                  <CustomTextField
                    type="number"
                    placeholder="Quantity"
                    value={variation.inventory.quantity}
                    size="small"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateVariation(variation._id, 'inventory.quantity', parseInt(e.target.value) || 0)}
                  />
                  <Typography variant="caption" color="textSecondary">
                    Available: {variation.inventory.available}
                  </Typography>
                </Grid>
                
                {/* Actions */}
                <Grid item xs={12} sm={1}>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Delete Variation">
                      <Button 
                        color="error" 
                        size="small"
                        onClick={() => handleDeleteVariation(variation._id)}
                      >
                        <IconX size={18} />
                      </Button>
                    </Tooltip>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          ))}
          
          <Button 
            variant="outlined" 
            startIcon={<IconPlus size={18} />} 
            onClick={handleAddVariation}
          >
            Add Another Variation
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default VariationCard;
