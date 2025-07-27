'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Checkbox,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Button,
  Tooltip,
  Slider
} from '@mui/material';
import {
  IconChevronDown,
  IconFilter,
  IconSettings,
  IconInfoCircle
} from '@tabler/icons-react';

interface Connection {
  _id: string;
  name: string;
  siteUrl: string;
}

interface ImportConfigurationProps {
  connection: Connection | null;
  onConfigurationChange: (config: any) => void;
  initialConfig?: any;
}

interface ImportFilters {
  status: string[];
  category: string[];
  featured?: boolean;
  onSale?: boolean;
  minPrice: string;
  maxPrice: string;
  stockStatus: string[];
  dateFrom: string;
  dateTo: string;
  includeVariations: boolean;
  updateExisting: boolean;
}

interface ImportOptions {
  batchSize: number;
  delayBetweenBatches: number;
  generateMissingSKUs: boolean;
  syncImages: boolean;
  createCategories: boolean;
}

const ImportConfiguration: React.FC<ImportConfigurationProps> = ({
  connection,
  onConfigurationChange,
  initialConfig
}) => {
  const [filters, setFilters] = useState<ImportFilters>({
    status: ['publish'],
    category: [],
    featured: undefined,
    onSale: undefined,
    minPrice: '',
    maxPrice: '',
    stockStatus: [],
    dateFrom: '',
    dateTo: '',
    includeVariations: true,
    updateExisting: true
  });

  const [options, setOptions] = useState<ImportOptions>({
    batchSize: 50,
    delayBetweenBatches: 1000,
    generateMissingSKUs: true,
    syncImages: true,
    createCategories: true
  });

  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Load initial configuration
  useEffect(() => {
    if (initialConfig) {
      setFilters({ ...filters, ...initialConfig.filters });
      setOptions({ ...options, ...initialConfig.options });
    }
  }, [initialConfig]);

  // Load categories when connection changes
  useEffect(() => {
    if (connection) {
      fetchCategories();
    }
  }, [connection]);

  // Update parent component when configuration changes
  useEffect(() => {
    onConfigurationChange({
      filters,
      options
    });
  }, [filters, options, onConfigurationChange]);

  const fetchCategories = async () => {
    if (!connection) return;

    setLoadingCategories(true);
    try {
      const response = await fetch(`/api/wordpress/connections/${connection._id}/categories`);
      const result = await response.json();
      
      if (result.success) {
        setAvailableCategories(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProductCount = async () => {
    if (!connection) return;

    setLoadingCount(true);
    try {
      const response = await fetch('/api/wordpress/products/count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: connection._id,
          filters
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setProductCount(result.data.count);
      }
    } catch (error) {
      console.error('Error fetching product count:', error);
    } finally {
      setLoadingCount(false);
    }
  };

  const handleFilterChange = (field: keyof ImportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionsChange = (field: keyof ImportOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked 
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    
    handleFilterChange('status', newStatus);
  };

  const handleStockStatusChange = (stockStatus: string, checked: boolean) => {
    const newStockStatus = checked 
      ? [...filters.stockStatus, stockStatus]
      : filters.stockStatus.filter(s => s !== stockStatus);
    
    handleFilterChange('stockStatus', newStockStatus);
  };

  if (!connection) {
    return (
      <Alert severity="warning">
        Please select a WordPress connection first.
      </Alert>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Import Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure filters and options for importing products from {connection.name}
        </Typography>
      </Box>

      {/* Product Count Preview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom>
                Import Preview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {productCount !== null ? (
                  `Approximately ${productCount.toLocaleString()} products will be imported`
                ) : (
                  'Click "Preview Count" to see how many products will be imported'
                )}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={fetchProductCount}
              disabled={loadingCount}
            >
              {loadingCount ? 'Loading...' : 'Preview Count'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Product Filters */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<IconChevronDown />}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconFilter size={20} />
            <Typography variant="h6">Product Filters</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Product Status */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Product Status
              </Typography>
              <FormGroup>
                {['publish', 'draft', 'pending', 'private'].map((status) => (
                  <FormControlLabel
                    key={status}
                    control={
                      <Checkbox
                        checked={filters.status.includes(status)}
                        onChange={(e) => handleStatusChange(status, e.target.checked)}
                      />
                    }
                    label={status.charAt(0).toUpperCase() + status.slice(1)}
                  />
                ))}
              </FormGroup>
            </Grid>

            {/* Stock Status */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Stock Status
              </Typography>
              <FormGroup>
                {['instock', 'outofstock', 'onbackorder'].map((stockStatus) => (
                  <FormControlLabel
                    key={stockStatus}
                    control={
                      <Checkbox
                        checked={filters.stockStatus.includes(stockStatus)}
                        onChange={(e) => handleStockStatusChange(stockStatus, e.target.checked)}
                      />
                    }
                    label={stockStatus === 'instock' ? 'In Stock' : 
                           stockStatus === 'outofstock' ? 'Out of Stock' : 'On Backorder'}
                  />
                ))}
              </FormGroup>
            </Grid>

            {/* Categories */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const category = availableCategories.find(cat => cat.id.toString() === value);
                        return (
                          <Chip key={value} label={category?.name || value} size="small" />
                        );
                      })}
                    </Box>
                  )}
                  disabled={loadingCategories}
                >
                  {availableCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Price Range */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Minimum Price"
                type="number"
                fullWidth
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Maximum Price"
                type="number"
                fullWidth
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Created From"
                type="date"
                fullWidth
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Created To"
                type="date"
                fullWidth
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Special Filters */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Special Filters
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.featured === true}
                      indeterminate={filters.featured === undefined}
                      onChange={(e) => {
                        const newValue = e.target.checked ? true : 
                                       filters.featured === true ? undefined : false;
                        handleFilterChange('featured', newValue);
                      }}
                    />
                  }
                  label="Featured Products Only"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.onSale === true}
                      indeterminate={filters.onSale === undefined}
                      onChange={(e) => {
                        const newValue = e.target.checked ? true : 
                                       filters.onSale === true ? undefined : false;
                        handleFilterChange('onSale', newValue);
                      }}
                    />
                  }
                  label="On Sale Products Only"
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Import Options */}
      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<IconChevronDown />}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconSettings size={20} />
            <Typography variant="h6">Import Options</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Batch Size */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Batch Size: {options.batchSize}
              </Typography>
              <Slider
                value={options.batchSize}
                onChange={(_, value) => handleOptionsChange('batchSize', value)}
                min={10}
                max={100}
                step={10}
                marks={[
                  { value: 10, label: '10' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Number of products to process in each batch
              </Typography>
            </Grid>

            {/* Delay Between Batches */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Delay: {options.delayBetweenBatches}ms
              </Typography>
              <Slider
                value={options.delayBetweenBatches}
                onChange={(_, value) => handleOptionsChange('delayBetweenBatches', value)}
                min={0}
                max={5000}
                step={500}
                marks={[
                  { value: 0, label: '0ms' },
                  { value: 1000, label: '1s' },
                  { value: 5000, label: '5s' }
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Delay between processing batches
              </Typography>
            </Grid>

            {/* Import Options Switches */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Import Preferences
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.includeVariations}
                      onChange={(e) => handleFilterChange('includeVariations', e.target.checked)}
                    />
                  }
                  label="Include Product Variations"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.updateExisting}
                      onChange={(e) => handleFilterChange('updateExisting', e.target.checked)}
                    />
                  }
                  label="Update Existing Products"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={options.syncImages}
                      onChange={(e) => handleOptionsChange('syncImages', e.target.checked)}
                    />
                  }
                  label="Import Product Images"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={options.generateMissingSKUs}
                      onChange={(e) => handleOptionsChange('generateMissingSKUs', e.target.checked)}
                    />
                  }
                  label="Generate Missing SKUs"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={options.createCategories}
                      onChange={(e) => handleOptionsChange('createCategories', e.target.checked)}
                    />
                  }
                  label="Create Missing Categories"
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Configuration Summary */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <IconInfoCircle size={20} color="blue" />
            <Typography variant="h6">Configuration Summary</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Product Status:</strong> {filters.status.join(', ') || 'All'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Categories:</strong> {filters.category.length || 'All'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Price Range:</strong> {
                  filters.minPrice || filters.maxPrice 
                    ? `${filters.minPrice || 'Any'} - ${filters.maxPrice || 'Any'}`
                    : 'Any'
                }
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Batch Size:</strong> {options.batchSize} products
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Include Variations:</strong> {filters.includeVariations ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Update Existing:</strong> {filters.updateExisting ? 'Yes' : 'No'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ImportConfiguration;