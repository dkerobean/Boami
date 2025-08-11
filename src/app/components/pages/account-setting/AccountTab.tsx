import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// components
import BlankCard from '../../shared/BlankCard';
import CustomTextField from '../../forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel';
import CustomSelect from '../../forms/theme-elements/CustomSelect';

// images
import { Stack } from '@mui/system';
import { useAuthContext } from '@/app/context/AuthContext';

// locations
const locations = [
  {
    value: 'us',
    label: 'United States',
  },
  {
    value: 'uk',
    label: 'United Kingdom',
  },
  {
    value: 'india',
    label: 'India',
  },
  {
    value: 'russia',
    label: 'Russia',
  },
];

// currency
const currencies = [
  {
    value: 'us',
    label: 'US Dollar ($)',
  },
  {
    value: 'uk',
    label: 'United Kingdom (Pound)',
  },
  {
    value: 'india',
    label: 'India (INR)',
  },
  {
    value: 'russia',
    label: 'Russia (Ruble)',
  },
];

const validationSchema = Yup.object({
  firstName: Yup.string().max(50, 'First name cannot exceed 50 characters').required('First name is required'),
  lastName: Yup.string().max(50, 'Last name cannot exceed 50 characters').required('Last name is required'),
  designation: Yup.string().max(100, 'Designation cannot exceed 100 characters'),
  phone: Yup.string().matches(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'),
  company: Yup.string().max(100, 'Company name cannot exceed 100 characters'),
});

const AccountTab = () => {
  const { user, isLoading: loading, error, updateProfile } = useAuthContext();
  const [successMessage, setSuccessMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [profileImageFile, setProfileImageFile] = React.useState<File | null>(null);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      designation: user?.designation || '',
      phone: user?.phone || '',
      company: user?.company || '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const success = await updateProfile(values);
        if (success) {
          setSuccessMessage('Profile updated successfully!');
        } else {
          setErrorMessage('Failed to update profile. Please try again.');
        }
      } catch (err) {
        setErrorMessage('An error occurred while updating profile.');
      }
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 800KB)
      if (file.size > 800 * 1024) {
        setErrorMessage('Image size must be less than 800KB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file');
        return;
      }

      setProfileImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfileImage = async () => {
    if (!profileImageFile) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('profileImage', profileImageFile);

    try {
      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccessMessage('Profile image updated successfully!');
          setPreviewImage(null);
          setProfileImageFile(null);
          // Refresh user data
          window.location.reload();
        } else {
          setErrorMessage(result.message || 'Failed to upload image');
        }
      } else {
        setErrorMessage('Failed to upload image');
      }
    } catch (error) {
      setErrorMessage('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const resetImage = () => {
    setProfileImageFile(null);
    setPreviewImage(null);
  };

  const getProfileImage = () => {
    if (previewImage) return previewImage;
    return user?.profileImage || user?.avatar || "/images/profile/user-1.jpg";
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading user data: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  return (
    <>
      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
      >
        <Alert onClose={() => setErrorMessage('')} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>

      <Grid container spacing={3}>
        {/* Change Profile */}
        <Grid item xs={12} lg={6}>
          <BlankCard>
            <CardContent>
              <Typography variant="h5" mb={1}>
                Change Profile
              </Typography>
              <Typography color="textSecondary" mb={3}>Change your profile picture from here</Typography>
              <Box textAlign="center" display="flex" justifyContent="center">
                <Box>
                  <Avatar
                    src={getProfileImage()}
                    alt={"user profile"}
                    sx={{ width: 120, height: 120, margin: '0 auto' }}
                  />
                  <Stack direction="row" justifyContent="center" spacing={2} my={3}>
                    <Button variant="contained" color="primary" component="label">
                      {uploadingImage ? <CircularProgress size={24} /> : 'Upload'}
                      <input hidden accept="image/*" type="file" onChange={handleImageUpload} />
                    </Button>
                    <Button variant="outlined" color="error" onClick={resetImage}>
                      Reset
                    </Button>
                    {profileImageFile && (
                      <Button variant="contained" color="success" onClick={uploadProfileImage} disabled={uploadingImage}>
                        Save
                      </Button>
                    )}
                  </Stack>
                   <Typography variant="subtitle1" color="textSecondary" mb={4}>
                     Allowed JPG, GIF, PNG or WebP. Max size of 800K
                   </Typography>
                </Box>
              </Box>
            </CardContent>
          </BlankCard>
        </Grid>
      {/*  Change Password */}
      <Grid item xs={12} lg={6}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Change Password
            </Typography>
            <Typography color="textSecondary" mb={3}>To change your password please confirm here</Typography>
            <form>
              <CustomFormLabel
                sx={{
                  mt: 0,
                }}
                htmlFor="text-cpwd"
              >
                Current Password
              </CustomFormLabel>
              <CustomTextField
                id="text-cpwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
              {/* 2 */}
              <CustomFormLabel htmlFor="text-npwd">New Password</CustomFormLabel>
              <CustomTextField
                id="text-npwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
              {/* 3 */}
              <CustomFormLabel htmlFor="text-conpwd">Confirm Password</CustomFormLabel>
              <CustomTextField
                id="text-conpwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
            </form>
          </CardContent>
        </BlankCard>
      </Grid>
      {/* Edit Details */}
      <Grid item xs={12}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Personal Details
            </Typography>
            <Typography color="textSecondary" mb={3}>To change your personal detail , edit and save from here</Typography>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="firstName"
                  >
                    First Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="firstName"
                    name="firstName"
                    value={formik.values.firstName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                    helperText={formik.touched.firstName && formik.errors.firstName}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="lastName"
                  >
                    Last Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="lastName"
                    name="lastName"
                    value={formik.values.lastName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                    helperText={formik.touched.lastName && formik.errors.lastName}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="designation"
                  >
                    Designation
                  </CustomFormLabel>
                  <CustomTextField
                    id="designation"
                    name="designation"
                    value={formik.values.designation}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.designation && Boolean(formik.errors.designation)}
                    helperText={formik.touched.designation && formik.errors.designation}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="company"
                  >
                    Company
                  </CustomFormLabel>
                  <CustomTextField
                    id="company"
                    name="company"
                    value={formik.values.company}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.company && Boolean(formik.errors.company)}
                    helperText={formik.touched.company && formik.errors.company}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="phone"
                  >
                    Phone
                  </CustomFormLabel>
                  <CustomTextField
                    id="phone"
                    name="phone"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.phone && Boolean(formik.errors.phone)}
                    helperText={formik.touched.phone && formik.errors.phone}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </BlankCard>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'end' }} mt={3}>
          <Button
            size="large"
            variant="contained"
            color="primary"
            onClick={() => formik.handleSubmit()}
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? <CircularProgress size={24} /> : 'Save'}
          </Button>
          <Button
            size="large"
            variant="text"
            color="error"
            onClick={() => formik.resetForm()}
          >
            Cancel
          </Button>
        </Stack>
      </Grid>
    </Grid>
    </>
  );
};

export default AccountTab;
