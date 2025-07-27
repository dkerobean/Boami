'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Alert,
  Snackbar,
  Paper,
  Container,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { IconHome, IconUser } from '@tabler/icons-react';
import ProfileImageUpload from './ProfileImageUpload';
import ProfileForm from './ProfileForm';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionStatus } from '@/components/subscription';
import { useSubscription } from '@/app/context/SubscriptionContext';
import SubscriptionManagement from './SubscriptionManagement';

const SimpleProfilePage: React.FC = () => {
  const { user, loading, error, updateUser, refetch } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleImageUpload = async (file: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Profile image updated successfully!');
        await refetch(); // Refresh user data
        return true;
      } else {
        setErrorMessage(result.message || 'Failed to upload image');
        return false;
      }
    } catch (error) {
      setErrorMessage('Error uploading image. Please try again.');
      return false;
    }
  };

  const handleFormSubmit = async (formData: any): Promise<boolean> => {
    try {
      const success = await updateUser(formData);
      if (success) {
        setSuccessMessage('Profile updated successfully!');
        return true;
      } else {
        setErrorMessage('Failed to update profile. Please try again.');
        return false;
      }
    } catch (error) {
      setErrorMessage('Error updating profile. Please try again.');
      return false;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="h6" color="text.secondary">
            Loading profile...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading profile: {error}
        </Alert>
      </Container>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please log in to view your profile.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMessage('')}
          severity="success"
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorMessage('')}
          severity="error"
          variant="filled"
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box mb={4}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <IconHome size={18} />
            Home
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconUser size={18} />
            Profile
          </Typography>
        </Breadcrumbs>

        <Typography variant="h4" fontWeight={600} gutterBottom>
          Edit Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Update your personal information and profile picture
        </Typography>
      </Box>

      {/* Main Content */}
      <Grid container spacing={4}>
        {/* Profile Image Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Profile Picture
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Update your profile picture to help others recognize you
            </Typography>

            <ProfileImageUpload
              currentImage={user.profileImage || user.avatar}
              onImageUpload={handleImageUpload}
              loading={loading}
              size={150}
            />
          </Paper>
        </Grid>

        {/* Profile Form Section */}
        <Grid item xs={12} md={8}>
          <ProfileForm
            initialData={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone,
              designation: user.designation,
              company: user.company,
            }}
            onSubmit={handleFormSubmit}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Subscription Management Section */}
      <Box mt={4}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Subscription & Billing
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage your subscription plan and billing information
          </Typography>

          <SubscriptionManagement userId={user._id} />
        </Paper>
      </Box>


      {/* User Info Display */}
      <Box mt={4}>
        <Paper elevation={1} sx={{ p: 3, backgroundColor: 'background.default' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Account Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Account Created
              </Typography>
              <Typography variant="body1">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Email Status
              </Typography>
              <Typography variant="body1" color={user.isEmailVerified ? 'success.main' : 'warning.main'}>
                {user.isEmailVerified ? 'Verified' : 'Not Verified'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Account Status
              </Typography>
              <Typography variant="body1" color={user.isActive ? 'success.main' : 'error.main'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default SimpleProfilePage;