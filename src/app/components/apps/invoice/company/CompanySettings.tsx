"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Stack,
  Paper,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  IconBuilding,
  IconUpload,
  IconDeviceFloppy,
  IconEdit,
  IconMail,
  IconPhone,
  IconWorld,
  IconMapPin,
  IconFileText,
} from "@tabler/icons-react";
import { CompanySettings as CompanySettingsType } from "@/app/(dashboard)/types/apps/invoice";

const CompanySettings: React.FC = () => {
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Company settings state
  const [companyData, setCompanyData] = useState<CompanySettingsType>({
    name: "",
    email: "",
    phone: "",
    address: "",
    logoUrl: "",
    taxNumber: "",
    website: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const handleInputChange = (field: keyof CompanySettingsType, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Load company settings on component mount
  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const response = await fetch('/api/company');
      const result = await response.json();
      
      if (result.success) {
        setCompanyData(result.data);
        if (result.data.logoUrl) {
          setLogoPreview(result.data.logoUrl);
        }
      } else {
        showMessage('Failed to load company settings', 'error');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
      showMessage('Failed to load company settings', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const showMessage = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };

  const validateForm = (): boolean => {
    if (!companyData.name.trim()) {
      showMessage('Company name is required', 'error');
      return false;
    }
    
    if (!companyData.email.trim()) {
      showMessage('Email is required', 'error');
      return false;
    }
    
    if (companyData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email)) {
      showMessage('Please enter a valid email address', 'error');
      return false;
    }
    
    if (companyData.website && companyData.website.trim() && !/^https?:\/\/.+\..+/.test(companyData.website)) {
      showMessage('Please enter a valid website URL', 'error');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      let logoUrl = companyData.logoUrl;
      
      // Upload logo first if a new file is selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        const logoResponse = await fetch('/api/company/logo', {
          method: 'POST',
          body: formData,
        });
        
        const logoResult = await logoResponse.json();
        
        if (logoResult.success) {
          logoUrl = logoResult.data.logoUrl;
        } else {
          throw new Error(logoResult.message || 'Failed to upload logo');
        }
      }
      
      // Save company settings
      const settingsData = {
        ...companyData,
        logoUrl
      };
      
      const response = await fetch('/api/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCompanyData(result.data);
        setLogoFile(null);
        if (result.data.logoUrl) {
          setLogoPreview(result.data.logoUrl);
        }
        showMessage('Company settings saved successfully!', 'success');
      } else {
        throw new Error(result.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
      showMessage(error instanceof Error ? error.message : 'Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    // Reload original data
    loadCompanySettings();
    setLogoFile(null);
  };

  if (isLoadingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={2}>
          <IconBuilding size={24} />
          <Typography variant="h5">
            Company Settings
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={isLoading || isLoadingData}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <IconDeviceFloppy />}
            onClick={handleSave}
            disabled={isLoading || isLoadingData}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body1" color="text.secondary" mb={3}>
        Configure your company information that will appear on all invoices.
      </Typography>

      <Grid container spacing={3}>
        {/* Company Logo Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Company Logo
            </Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                src={logoPreview || companyData.logoUrl}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "primary.light",
                }}
              >
                <IconBuilding size={32} />
              </Avatar>
              <Box>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="logo-upload"
                  type="file"
                  onChange={handleLogoChange}
                />
                <label htmlFor="logo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<IconUpload />}
                  >
                    Upload Logo
                  </Button>
                </label>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Recommended: PNG or JPG, max 2MB
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Company Name"
                value={companyData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                InputProps={{
                  startAdornment: <IconBuilding size={20} style={{ marginRight: 8 }} />,
                }}
                required
                error={Boolean(!companyData.name.trim())}
                helperText={!companyData.name.trim() ? "Company name is required" : undefined}
                disabled={isLoading}
              />
              
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={companyData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                InputProps={{
                  startAdornment: <IconMail size={20} style={{ marginRight: 8 }} />,
                }}
                required
                error={Boolean(!companyData.email.trim() || (companyData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email)))}
                helperText={!companyData.email.trim() ? "Email is required" : (companyData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email)) ? "Please enter a valid email address" : undefined}
                disabled={isLoading}
              />
              
              <TextField
                fullWidth
                label="Phone Number"
                value={companyData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                InputProps={{
                  startAdornment: <IconPhone size={20} style={{ marginRight: 8 }} />,
                }}
                disabled={isLoading}
              />
              
              <TextField
                fullWidth
                label="Website"
                value={companyData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                InputProps={{
                  startAdornment: <IconWorld size={20} style={{ marginRight: 8 }} />,
                }}
                placeholder="https://www.yourcompany.com"
                error={Boolean(companyData.website && companyData.website.trim() && !/^https?:\/\/.+\..+/.test(companyData.website))}
                helperText={companyData.website && companyData.website.trim() && !/^https?:\/\/.+\..+/.test(companyData.website) ? "Please enter a valid website URL (e.g., https://example.com)" : undefined}
                disabled={isLoading}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Address & Tax Information */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Address & Tax Information
            </Typography>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Company Address"
                multiline
                rows={4}
                value={companyData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <IconMapPin 
                      size={20} 
                      style={{ 
                        marginRight: 8, 
                        alignSelf: 'flex-start', 
                        marginTop: 12 
                      }} 
                    />
                  ),
                }}
                placeholder="Enter your complete business address"
                disabled={isLoading}
              />
              
              <TextField
                fullWidth
                label="Tax/VAT Number"
                value={companyData.taxNumber}
                onChange={(e) => handleInputChange("taxNumber", e.target.value)}
                InputProps={{
                  startAdornment: <IconFileText size={20} style={{ marginRight: 8 }} />,
                }}
                placeholder="e.g., VAT123456789"
                disabled={isLoading}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Preview Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Invoice Header Preview
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Stack spacing={1}>
                  <Typography variant="h5" fontWeight="bold">
                    {companyData.name || "Your Company Name"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" whiteSpace="pre-line">
                    {companyData.address || "Your company address will appear here"}
                  </Typography>
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    {companyData.email && (
                      <Typography variant="body2">
                        📧 {companyData.email}
                      </Typography>
                    )}
                    {companyData.phone && (
                      <Typography variant="body2">
                        📞 {companyData.phone}
                      </Typography>
                    )}
                  </Stack>
                  {companyData.website && (
                    <Typography variant="body2" color="primary">
                      🌐 {companyData.website}
                    </Typography>
                  )}
                  {companyData.taxNumber && (
                    <Typography variant="body2" color="text.secondary">
                      Tax Number: {companyData.taxNumber}
                    </Typography>
                  )}
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box display="flex" justifyContent="flex-end">
                  <Avatar
                    src={logoPreview || companyData.logoUrl}
                    sx={{
                      width: 100,
                      height: 100,
                      bgcolor: "primary.light",
                    }}
                  >
                    <IconBuilding size={40} />
                  </Avatar>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompanySettings;