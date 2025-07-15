import React from "react";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import { Grid } from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import QuillEdit from "@/app/components/forms/form-quill/QuillEdit";

interface GeneralCardProps {
  productData?: any;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
}

const GeneralCard = ({ productData, onNameChange, onDescriptionChange }: GeneralCardProps) => {
  return (
    <Box p={3}>
      <Typography variant="h5">General</Typography>

      <Grid container mt={3}>
        {/* 1 */}
        <Grid item xs={12} display="flex" alignItems="center">
          <CustomFormLabel htmlFor="p_name" sx={{ mt: 0 }}>
            Product Name{" "}
            <Typography color="error.main" component="span">
              *
            </Typography>
          </CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <CustomTextField
            id="p_name"
            placeholder="Product Name"
            value={productData?.title || ""}
            fullWidth
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNameChange?.(e.target.value)}
          />
          <Typography variant="body2">
            A product name is required and recommended to be unique.
          </Typography>
        </Grid>

        <Grid item xs={12} display="flex" alignItems="center">
          <CustomFormLabel htmlFor="desc">Description</CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <QuillEdit 
            value={productData?.description || ""} 
            onChange={(value: string) => onDescriptionChange?.(value)}
          />
          <Typography variant="body2">
            Set a description to the product for better visibility.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GeneralCard;
