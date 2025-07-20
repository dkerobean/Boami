'use client';

import React from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { IconUser, IconMail, IconPhone, IconBriefcase } from '@tabler/icons-react';
import PhoneInputComponent from './PhoneInput';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  company: string;
}

interface ProfileFormProps {
  initialData?: Partial<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => Promise<boolean>;
  loading?: boolean;
}

const validationSchema = Yup.object({
  firstName: Yup.string()
    .required('First name is required')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: Yup.string()
    .required('Last name is required')
    .max(50, 'Last name cannot exceed 50 characters'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: Yup.string()
    .nullable()
    .transform((value) => value || null)
    .test('phone-length', 'Please enter a valid phone number', function(value) {
      if (!value) return true; // Allow empty
      return value.length >= 10 && value.length <= 15; // Basic length validation
    })
    .optional(),
  designation: Yup.string()
    .max(100, 'Designation cannot exceed 100 characters')
    .optional(),
  company: Yup.string()
    .max(100, 'Company name cannot exceed 100 characters')
    .optional(),
});

const FormSection = ({ title, children, icon }: { title: string; children: React.ReactNode; icon: React.ReactNode }) => (
  <Box mb={4}>
    <Box display="flex" alignItems="center" gap={1} mb={2}>
      {icon}
      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>
    </Box>
    <Divider sx={{ mb: 3 }} />
    {children}
  </Box>
);

const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
}) => {
  const formik = useFormik<ProfileFormData>({
    initialValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      designation: initialData?.designation || '',
      company: initialData?.company || '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await onSubmit(values);
    },
  });

  return (
    <Paper elevation={1} sx={{ p: 4 }}>
      <form onSubmit={formik.handleSubmit}>
        <FormSection
          title="Personal Information"
          icon={<IconUser size={20} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="firstName"
                label="First Name"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                helperText={formik.touched.firstName && formik.errors.firstName}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="lastName"
                label="Last Name"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                helperText={formik.touched.lastName && formik.errors.lastName}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="email"
                label="Email Address"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                disabled={loading}
                required
                InputProps={{
                  startAdornment: <IconMail size={20} style={{ marginRight: 8, opacity: 0.7 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconPhone size={20} style={{ opacity: 0.7 }} />
                Phone Number
              </Typography>
              <PhoneInputComponent
                value={formik.values.phone}
                onChange={(value) => formik.setFieldValue('phone', value)}
                onBlur={() => formik.setFieldTouched('phone', true)}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone ? String(formik.errors.phone) : undefined}
                disabled={loading}
                placeholder="Enter phone number"
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection
          title="Professional Information"
          icon={<IconBriefcase size={20} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="designation"
                label="Job Title / Designation"
                value={formik.values.designation}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.designation && Boolean(formik.errors.designation)}
                helperText={formik.touched.designation && formik.errors.designation}
                disabled={loading}
                placeholder="e.g., Senior Developer"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="company"
                label="Company"
                value={formik.values.company}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.company && Boolean(formik.errors.company)}
                helperText={formik.touched.company && formik.errors.company}
                disabled={loading}
                placeholder="e.g., Boami Inc."
              />
            </Grid>
          </Grid>
        </FormSection>


        <Box display="flex" gap={2} justifyContent="flex-end" pt={2}>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            onClick={() => formik.resetForm()}
            disabled={loading}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !formik.isValid}
            startIcon={loading && <CircularProgress size={16} />}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default ProfileForm;