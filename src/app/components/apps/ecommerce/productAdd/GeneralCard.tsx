import React from "react";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import { Grid } from "@mui/material";
import { useFormikContext } from "formik";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import QuillEdit from "@/app/components/forms/form-quill/QuillEdit";

const GeneralCard = () => {
  const { values, errors, touched, handleChange, handleBlur, setFieldValue } = useFormikContext<any>();

  const handleDescriptionChange = (content: string) => {
    setFieldValue("description", content);
  };

  return (
    <Box p={3}>
      <Typography variant="h5">General</Typography>

      <Grid container mt={3}>
        <Grid item xs={12} display="flex" alignItems="center">
          <CustomFormLabel htmlFor="title" sx={{ mt: 0 }}>
            Product Name{" "}
            <Typography color="error.main" component="span">
              *
            </Typography>
          </CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <CustomTextField 
            id="title"
            name="title"
            placeholder="Product Name" 
            fullWidth 
            value={values.title}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.title && Boolean(errors.title)}
            helperText={touched.title && errors.title}
          />
          <Typography variant="body2">
            A product name is required and recommended to be unique.
          </Typography>
        </Grid>


        <Grid item xs={12} display="flex" alignItems="center" mt={3}>
          <CustomFormLabel htmlFor="description">
            Description{" "}
            <Typography color="error.main" component="span">
              *
            </Typography>
          </CustomFormLabel>
        </Grid>
        <Grid item xs={12}>
          <QuillEdit 
            value={values.description}
            onChange={handleDescriptionChange}
          />
          {touched.description && errors.description && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {typeof errors.description === 'string' ? errors.description : 'Description is required'}
            </Typography>
          )}
          <Typography variant="body2">
            Set a description to the product for better visibility.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GeneralCard;
