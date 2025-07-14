"use client";
import React from "react";
import Box from "@mui/material/Box";
import { Grid, Typography, FormControlLabel, Switch } from "@mui/material";
import { MenuItem, Avatar } from "@mui/material";
import { useFormikContext } from "formik";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";

const StatusCard = () => {
  const { values, setFieldValue } = useFormikContext<any>();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "publish": return "primary.main";
      case "draft": return "error.main";
      case "private": return "secondary.main";
      case "pending": return "warning.main";
      default: return "error.main";
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Status & Settings</Typography>
        <Avatar
          sx={{
            backgroundColor: getStatusColor(values.status),
            "& svg": { display: "none" },
            width: 15,
            height: 15,
          }}
        />
      </Box>

      <Grid container mt={3} spacing={2}>
        <Grid item xs={12}>
          <CustomFormLabel htmlFor="status">Product Status</CustomFormLabel>
          <CustomSelect 
            value={values.status} 
            onChange={(e: React.ChangeEvent<{ value: unknown }>) => setFieldValue("status", e.target.value)}
            fullWidth
          >
            <MenuItem value="publish">Published</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="private">Private</MenuItem>
            <MenuItem value="pending">Pending Review</MenuItem>
          </CustomSelect>
          <Typography variant="body2">Set the product visibility status.</Typography>
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={values.manageStock}
                onChange={(e) => setFieldValue("manageStock", e.target.checked)}
              />
            }
            label="Manage Stock"
          />
          <Typography variant="body2">Enable inventory tracking.</Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StatusCard;
