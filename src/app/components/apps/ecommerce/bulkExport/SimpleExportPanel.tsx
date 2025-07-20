'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  IconShoppingCart,
  IconCreditCard,
  IconReceipt,
  IconReport,
  IconDownload,
  IconCalendar,
  IconFilter
} from '@tabler/icons-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

export type ExportType = 'products' | 'sales' | 'expenses' | 'financial-summary';

interface SimpleExportOptions {
  type: ExportType;
  format: 'csv' | 'excel' | 'json';
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  category?: string;
}

interface SimpleExportPanelProps {
  onExport: (options: SimpleExportOptions) => void;
}

// Export type configurations
const EXPORT_TYPES = {
  products: {
    title: 'Products Export',
    description: 'Export all product information including inventory, pricing, and categories',
    icon: IconShoppingCart,
    color: 'primary.main',
    fields: ['ID', 'Name', 'SKU', 'Price', 'Category', 'Stock', 'Status', 'Created Date'],
    filters: ['dateRange', 'category'],
    estimatedRecords: 1250,
  },
  sales: {
    title: 'Sales Export',
    description: 'Export sales and order data with customer information and totals',
    icon: IconCreditCard,
    color: 'success.main',
    fields: ['Order ID', 'Date', 'Customer', 'Products', 'Total', 'Status', 'Payment Method'],
    filters: ['dateRange'],
    estimatedRecords: 856,
  },
  expenses: {
    title: 'Expenses Export',
    description: 'Export expense records with categories, vendors, and payment details',
    icon: IconReceipt,
    color: 'warning.main',
    fields: ['Date', 'Description', 'Amount', 'Category', 'Vendor', 'Status'],
    filters: ['dateRange', 'category'],
    estimatedRecords: 342,
  },
  'financial-summary': {
    title: 'Financial Summary',
    description: 'Export comprehensive financial overview with income, expenses, and profit analysis',
    icon: IconReport,
    color: 'info.main',
    fields: ['Date', 'Income Total', 'Expenses Total', 'Profit/Loss', 'Top Products', 'Top Expenses'],
    filters: ['dateRange'],
    estimatedRecords: 24,
  },
};

const CATEGORIES = [
  'All Categories',
  'Electronics',
  'Clothing',
  'Books',
  'Home & Garden',
  'Sports & Outdoors',
  'Beauty & Health',
  'Automotive',
  'Food & Beverages',
];

const SimpleExportPanel: React.FC<SimpleExportPanelProps> = ({ onExport }) => {
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [format, setFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [category, setCategory] = useState<string>('All Categories');

  const handleExport = () => {
    if (!selectedType) return;

    const exportOptions: SimpleExportOptions = {
      type: selectedType,
      format,
      dateRange,
      category: category !== 'All Categories' ? category : undefined,
    };

    onExport(exportOptions);
  };

  const getEstimatedFileSize = () => {
    if (!selectedType) return '0 KB';

    const config = EXPORT_TYPES[selectedType];
    let size = config.estimatedRecords * config.fields.length * 50; // 50 bytes per field average

    if (format === 'excel') size *= 1.2;
    if (format === 'json') size *= 1.5;

    return Math.round(size / 1024) + ' KB';
  };

  return (
    <Box>
      {/* Export Type Selection */}
      <Typography variant="h6" mb={3}>
        Choose Export Type
      </Typography>

      <Grid container spacing={3} mb={4}>
        {Object.entries(EXPORT_TYPES).map(([type, config]) => {
          const IconComponent = config.icon;
          const isSelected = selectedType === type;

          return (
            <Grid item xs={12} sm={6} key={type}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? config.color : 'divider',
                  '&:hover': { borderColor: config.color },
                  transition: 'all 0.2s ease-in-out',
                }}
                onClick={() => setSelectedType(type as ExportType)}
              >
                <CardContent>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <IconComponent
                      size={32}
                      style={{
                        color: isSelected ? config.color : 'inherit',
                        marginTop: 4
                      }}
                    />
                    <Box flex={1}>
                      <Typography
                        variant="h6"
                        color={isSelected ? config.color : 'text.primary'}
                        mb={1}
                      >
                        {config.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {config.description}
                      </Typography>

                      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                        {config.fields.slice(0, 4).map((field) => (
                          <Chip
                            key={field}
                            label={field}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {config.fields.length > 4 && (
                          <Chip
                            label={`+${config.fields.length - 4} more`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        ~{config.estimatedRecords.toLocaleString()} records
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {selectedType && (
        <>
          <Divider sx={{ mb: 3 }} />

          {/* Export Configuration */}
          <Typography variant="h6" mb={3}>
            Export Configuration
          </Typography>

          <Grid container spacing={3} mb={3}>
            {/* Format Selection */}
            <Grid item xs={12} md={4}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 1 }}>
                  Export Format
                </FormLabel>
                <RadioGroup
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'csv' | 'excel' | 'json')}
                >
                  <FormControlLabel value="csv" control={<Radio />} label="CSV" />
                  <FormControlLabel value="excel" control={<Radio />} label="Excel (XLSX)" />
                  <FormControlLabel value="json" control={<Radio />} label="JSON" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Filters */}
            <Grid item xs={12} md={8}>
              <Typography variant="subtitle1" mb={2} display="flex" alignItems="center" gap={1}>
                <IconFilter size={18} />
                Filters
              </Typography>

              <Grid container spacing={2}>
                {/* Date Range */}
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={dateRange.start}
                      onChange={(date: Date | null) =>
                        setDateRange(prev => ({ ...prev, start: date }))
                      }
                      renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date"
                      value={dateRange.end}
                      onChange={(date: Date | null) =>
                        setDateRange(prev => ({ ...prev, end: date }))
                      }
                      renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>

                {/* Category Filter (for products and expenses) */}
                {(selectedType === 'products' || selectedType === 'expenses') && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={category}
                        label="Category"
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>

          {/* Export Summary */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Export Summary:</strong> {EXPORT_TYPES[selectedType].title} • {format.toUpperCase()} format •
              Estimated file size: {getEstimatedFileSize()} •
              {dateRange.start && dateRange.end
                ? `Date range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                : 'All dates'
              }
            </Typography>
          </Alert>

          {/* Export Button */}
          <Box display="flex" justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={handleExport}
              startIcon={<IconDownload />}
              sx={{ minWidth: 200 }}
            >
              Start Export
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SimpleExportPanel;