'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconPlus,
  IconUpload,
  IconDownload,
  IconSearch,
  IconAlertTriangle,
  IconPackage,
  IconBrandWordpress,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ManagementActionsProps {
  onSearchChange?: (search: string) => void;
  searchValue?: string;
  totalProducts?: number;
  alertsCount?: number;
}

const ManagementActions = ({ 
  onSearchChange, 
  searchValue = '', 
  totalProducts = 0,
  alertsCount = 0 
}: ManagementActionsProps) => {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <Card elevation={1} sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          {/* Left side - Search and Info */}
          <Grid item xs={12} lg={7}>
            <Stack spacing={2}>
              <TextField
                placeholder="Search products by name, SKU, or category..."
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Chip
                  icon={<IconPackage size={16} />}
                  label={`${totalProducts.toLocaleString()} Products`}
                  variant="outlined"
                  size="small"
                />
                {alertsCount > 0 && (
                  <Chip
                    icon={<IconAlertTriangle size={16} />}
                    label={`${alertsCount} Stock Alerts`}
                    color="warning"
                    size="small"
                    onClick={() => handleNavigation('/apps/ecommerce/stock-alerts')}
                    clickable
                    sx={{ cursor: 'pointer' }}
                  />
                )}
              </Box>
            </Stack>
          </Grid>

          {/* Right side - Action Buttons */}
          <Grid item xs={12} lg={5}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={1.5} 
              justifyContent={{ lg: 'flex-end' }}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={<IconPlus />}
                onClick={() => handleNavigation('/apps/ecommerce/add-product')}
                sx={{ borderRadius: 2 }}
              >
                Add Product
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<IconUpload />}
                onClick={() => handleNavigation('/apps/ecommerce/bulk-upload')}
                sx={{ borderRadius: 2 }}
              >
                Bulk Upload
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<IconDownload />}
                onClick={() => handleNavigation('/apps/ecommerce/bulk-export')}
                sx={{ borderRadius: 2 }}
              >
                Export
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                startIcon={<IconBrandWordpress />}
                onClick={() => handleNavigation('/apps/ecommerce/bulk-upload')}
                title="Import products from WordPress/WooCommerce or CSV files"
                sx={{ borderRadius: 2 }}
              >
                WordPress Import
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {/* Quick Actions Section */}
        <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Quick Actions
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="text"
              onClick={() => handleNavigation('/apps/ecommerce/stock-alerts')}
            >
              View Stock Alerts
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => handleNavigation('/apps/ecommerce/list')}
            >
              Manage Products
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => handleNavigation('/dashboards/ecommerce')}
            >
              View Analytics
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => handleNavigation('/apps/ecommerce/shop/recent-activities')}
            >
              Recent Activities
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ManagementActions;