"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import { 
  Button, 
  Grid, 
  Tooltip, 
  MenuItem, 
  IconButton,
  Paper,
  Divider,
  Chip,
  Stack
} from "@mui/material";
import { Typography } from "@mui/material";
import { useFormikContext } from "formik";

import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconX, IconPlus } from "@tabler/icons-react";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";

interface Variation {
  id: string;
  name: string;
  values: string[];
}

const VariationCard = () => {
  const { values, setFieldValue } = useFormikContext<any>();
  const [newVariationName, setNewVariationName] = useState("");
  const [newVariationValue, setNewVariationValue] = useState("");

  // Initialize variations if not exists
  const variations: Variation[] = values.variations || [];

  const addVariation = () => {
    if (!newVariationName.trim()) return;

    const newVariation: Variation = {
      id: Date.now().toString(),
      name: newVariationName.trim(),
      values: []
    };

    setFieldValue("variations", [...variations, newVariation]);
    setNewVariationName("");
  };

  const removeVariation = (variationId: string) => {
    const updatedVariations = variations.filter(v => v.id !== variationId);
    setFieldValue("variations", updatedVariations);
  };

  const addVariationValue = (variationId: string) => {
    if (!newVariationValue.trim()) return;

    const updatedVariations = variations.map(variation => {
      if (variation.id === variationId) {
        return {
          ...variation,
          values: [...variation.values, newVariationValue.trim()]
        };
      }
      return variation;
    });

    setFieldValue("variations", updatedVariations);
    setNewVariationValue("");
  };

  const removeVariationValue = (variationId: string, valueIndex: number) => {
    const updatedVariations = variations.map(variation => {
      if (variation.id === variationId) {
        return {
          ...variation,
          values: variation.values.filter((_, index) => index !== valueIndex)
        };
      }
      return variation;
    });

    setFieldValue("variations", updatedVariations);
  };

  const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>Product Variations</Typography>
      
      <Typography variant="body2" color="textSecondary" mb={3}>
        Add variations like size, color, material to create different product options.
      </Typography>

      {/* Add New Variation */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={2}>Add Variation Attribute</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <CustomTextField
              placeholder="Variation name (e.g., Size, Color, Material)"
              fullWidth
              value={newVariationName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVariationName(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, addVariation)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              startIcon={<IconPlus size={18} />}
              onClick={addVariation}
              disabled={!newVariationName.trim()}
              fullWidth
            >
              Add Variation
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Existing Variations */}
      {variations.map((variation) => (
        <Paper key={variation.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{variation.name}</Typography>
            <Tooltip title="Remove variation">
              <IconButton
                color="error"
                onClick={() => removeVariation(variation.id)}
                size="small"
              >
                <IconX size={18} />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Variation Values */}
          {variation.values.length > 0 && (
            <Box mb={2}>
              <Typography variant="body2" mb={1}>Values:</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {variation.values.map((value, index) => (
                  <Chip
                    key={index}
                    label={value}
                    variant="outlined"
                    onDelete={() => removeVariationValue(variation.id, index)}
                    deleteIcon={<IconX size={14} />}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Add New Value */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <CustomTextField
                placeholder={`Add ${variation.name.toLowerCase()} value (e.g., Small, Red, Cotton)`}
                fullWidth
                value={newVariationValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVariationValue(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => handleKeyPress(e, () => addVariationValue(variation.id))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                startIcon={<IconPlus size={16} />}
                onClick={() => addVariationValue(variation.id)}
                disabled={!newVariationValue.trim()}
                fullWidth
                size="small"
              >
                Add Value
              </Button>
            </Grid>
          </Grid>
        </Paper>
      ))}

      {variations.length === 0 && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3, 
            textAlign: 'center', 
            backgroundColor: 'grey.50',
            border: '2px dashed',
            borderColor: 'grey.300'
          }}
        >
          <Typography variant="body1" color="textSecondary">
            No variations added yet. Add variations to create different product options.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default VariationCard;
