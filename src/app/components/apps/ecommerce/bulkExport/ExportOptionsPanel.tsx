'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Alert,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import { IconDownload, IconFilter, IconChevronDown, IconCalendar, IconTag } from '@tabler/icons-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  fields: string[];
  filters: {
    category?: string;
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    priceRange?: {
      min: number;
      max: number;
    };
    searchQuery?: string;
  };
  options: {
    includeImages: boolean;
    includeVariants: boolean;
    includeCategories: boolean;
    includeTags: boolean;
  };
}

interface ExportOptionsPanelProps {
  onExport: (options: ExportOptions) => void;
}

// Available fields for export
const AVAILABLE_FIELDS = [
  { value: 'id', label: 'Product ID', category: 'basic' },
  { value: 'name', label: 'Product Name', category: 'basic' },
  { value: 'sku', label: 'SKU', category: 'basic' },
  { value: 'price', label: 'Price', category: 'basic' },
  { value: 'sale_price', label: 'Sale Price', category: 'basic' },
  { value: 'cost_price', label: 'Cost Price', category: 'basic' },
  { value: 'category', label: 'Category', category: 'basic' },
  { value: 'status', label: 'Status', category: 'basic' },
  { value: 'stock_quantity', label: 'Stock Quantity', category: 'inventory' },
  { value: 'low_stock_threshold', label: 'Low Stock Threshold', category: 'inventory' },
  { value: 'manage_stock', label: 'Manage Stock', category: 'inventory' },
  { value: 'stock_status', label: 'Stock Status', category: 'inventory' },
  { value: 'description', label: 'Description', category: 'content' },
  { value: 'short_description', label: 'Short Description', category: 'content' },
  { value: 'tags', label: 'Tags', category: 'content' },
  { value: 'images', label: 'Images', category: 'content' },
  { value: 'weight', label: 'Weight', category: 'shipping' },
  { value: 'dimensions', label: 'Dimensions', category: 'shipping' },
  { value: 'shipping_class', label: 'Shipping Class', category: 'shipping' },
  { value: 'tax_class', label: 'Tax Class', category: 'tax' },
  { value: 'tax_status', label: 'Tax Status', category: 'tax' },
  { value: 'featured', label: 'Featured', category: 'seo' },
  { value: 'visibility', label: 'Visibility', category: 'seo' },
  { value: 'meta_title', label: 'Meta Title', category: 'seo' },
  { value: 'meta_description', label: 'Meta Description', category: 'seo' },
  { value: 'created_at', label: 'Created Date', category: 'dates' },
  { value: 'updated_at', label: 'Updated Date', category: 'dates' },
];

const FIELD_CATEGORIES = [
  { value: 'basic', label: 'Basic Information' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'content', label: 'Content' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'tax', label: 'Tax' },
  { value: 'seo', label: 'SEO' },
  { value: 'dates', label: 'Dates' },
];

const ExportOptionsPanel: React.FC<ExportOptionsPanelProps> = ({ onExport }) => {
  const [format, setFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'id', 'name', 'sku', 'price', 'category', 'status', 'stock_quantity'
  ]);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    searchQuery: '',
    priceMin: '',
    priceMax: '',
    dateStart: null as Date | null,
    dateEnd: null as Date | null,
  });
  const [options, setOptions] = useState({
    includeImages: false,
    includeVariants: false,
    includeCategories: true,
    includeTags: true,
  });

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSelectAllFields = (category: string) => {
    const categoryFields = AVAILABLE_FIELDS
      .filter(field => field.category === category)
      .map(field => field.value);

    const allSelected = categoryFields.every(field => selectedFields.includes(field));

    if (allSelected) {
      setSelectedFields(prev => prev.filter(field => !categoryFields.includes(field)));
    } else {
      setSelectedFields(prev => {
        const newFields = [...prev, ...categoryFields];
        return Array.from(new Set(newFields));
      });
    }
  };

  const handlePresetSelection = (preset: 'basic' | 'complete' | 'inventory') => {
    switch (preset) {
      case 'basic':
        setSelectedFields(['id', 'name', 'sku', 'price', 'category', 'status']);
        break;
      case 'complete':
        setSelectedFields(AVAILABLE_FIELDS.map(field => field.value));
        break;
      case 'inventory':
        setSelectedFields([
          'id', 'name', 'sku', 'stock_quantity', 'low_stock_threshold',
          'manage_stock', 'stock_status', 'price', 'cost_price'
        ]);
        break;
    }
  };

  const handleExport = () => {
    const exportOptions: ExportOptions = {
      format,
      fields: selectedFields,
      filters: {
        category: filters.category || undefined,
        status: filters.status || undefined,
        searchQuery: filters.searchQuery || undefined,
        priceRange: (filters.priceMin || filters.priceMax) ? {
          min: parseFloat(filters.priceMin) || 0,
          max: parseFloat(filters.priceMax) || 999999,
        } : undefined,
        dateRange: (filters.dateStart || filters.dateEnd) ? {
          start: filters.dateStart?.toISOString() || '',
          end: filters.dateEnd?.toISOString() || '',
        } : undefined,
      },
      options,
    };

    onExport(exportOptions);
  };

  const getEstimatedRecords = () => {
    // Mock calculation based on filters
    let base = 1250; // Total products

    if (filters.category) base *= 0.3;
    if (filters.status) base *= 0.8;
    if (filters.searchQuery) base *= 0.2;
    if (filters.priceMin || filters.priceMax) base *= 0.6;
    if (filters.dateStart || filters.dateEnd) base *= 0.4;

    return Math.floor(base);
  };

  const getEstimatedFileSize = () => {
    const recordCount = getEstimatedRecords();
    const fieldCount = selectedFields.length;
    const avgFieldSize = 50; // bytes

    let sizeBytes = recordCount * fieldCount * avgFieldSize;

    if (format === 'excel') sizeBytes *= 1.2;
    if (format === 'json') sizeBytes *= 1.5;

    return Math.round(sizeBytes / 1024); // KB
  };

  return (
    <Box>
      {/* Format Selection */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Export Format
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            row
            value={format}
            onChange={(e) => setFormat(e.target.value as 'csv' | 'excel' | 'json')}
          >
            <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            <FormControlLabel value="excel" control={<Radio />} label="Excel" />
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Field Selection */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            Fields to Export
          </Typography>
          <Box display="flex" gap={1}>
            <Button size="small" onClick={() => handlePresetSelection('basic')}>
              Basic
            </Button>
            <Button size="small" onClick={() => handlePresetSelection('inventory')}>
              Inventory
            </Button>
            <Button size="small" onClick={() => handlePresetSelection('complete')}>
              Complete
            </Button>
          </Box>
        </Box>

        <Box mb={2}>
          <Chip
            label={`${selectedFields.length} fields selected`}
            color="primary"
            variant="outlined"
          />
        </Box>

        {FIELD_CATEGORIES.map(category => (
          <Accordion key={category.value} defaultExpanded={category.value === 'basic'}>
            <AccordionSummary expandIcon={<IconChevronDown />}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Typography variant="subtitle1">
                  {category.label}
                </Typography>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllFields(category.value);
                  }}
                >
                  Select All
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                <Grid container spacing={1}>
                  {AVAILABLE_FIELDS
                    .filter(field => field.category === category.value)
                    .map(field => (
                      <Grid item xs={12} sm={6} md={4} key={field.value}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedFields.includes(field.value)}
                              onChange={() => handleFieldToggle(field.value)}
                            />
                          }
                          label={field.label}
                        />
                      </Grid>
                    ))}
                </Grid>
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Filters */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Products"
              placeholder="Search by name, SKU, or description"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="Electronics">Electronics</MenuItem>
                <MenuItem value="Clothing">Clothing</MenuItem>
                <MenuItem value="Books">Books</MenuItem>
                <MenuItem value="Home">Home & Garden</MenuItem>
                <MenuItem value="Sports">Sports & Outdoors</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Min Price"
              type="number"
              value={filters.priceMin}
              onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Max Price"
              type="number"
              value={filters.priceMax}
              onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={filters.dateStart}
                onChange={(date: Date | null) => setFilters(prev => ({ ...prev, dateStart: date }))}
                renderInput={(params) => <TextField {...params} size="small" fullWidth />}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={filters.dateEnd}
                onChange={(date: Date | null) => setFilters(prev => ({ ...prev, dateEnd: date }))}
                renderInput={(params) => <TextField {...params} size="small" fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Box>

      {/* Export Options */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Export Options
        </Typography>

        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeImages}
                onChange={(e) => setOptions(prev => ({ ...prev, includeImages: e.target.checked }))}
              />
            }
            label="Include product images"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeVariants}
                onChange={(e) => setOptions(prev => ({ ...prev, includeVariants: e.target.checked }))}
              />
            }
            label="Include product variants"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeCategories}
                onChange={(e) => setOptions(prev => ({ ...prev, includeCategories: e.target.checked }))}
              />
            }
            label="Include category hierarchy"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeTags}
                onChange={(e) => setOptions(prev => ({ ...prev, includeTags: e.target.checked }))}
              />
            }
            label="Include product tags"
          />
        </FormGroup>
      </Box>

      {/* Export Summary */}
      <Box mb={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Export Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Estimated Records
                </Typography>
                <Typography variant="h6">
                  {getEstimatedRecords().toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Selected Fields
                </Typography>
                <Typography variant="h6">
                  {selectedFields.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Estimated File Size
                </Typography>
                <Typography variant="h6">
                  {getEstimatedFileSize()} KB
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Export Button */}
      <Box display="flex" justifyContent="center">
        <Button
          variant="contained"
          size="large"
          onClick={handleExport}
          startIcon={<IconDownload />}
          disabled={selectedFields.length === 0}
        >
          Start Export
        </Button>
      </Box>
    </Box>
  );
};

export default ExportOptionsPanel;