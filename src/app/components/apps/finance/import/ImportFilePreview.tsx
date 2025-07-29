'use client';

import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { IconArrowRight, IconCheck, IconAlertTriangle } from '@tabler/icons-react';

interface ParsedData {
  headers: string[];
  data: any[];
  totalRows: number;
  previewData: any[];
  detectedColumns: {
    date?: string;
    description?: string;
    amount?: string;
    category?: string;
    vendor?: string;
    recurring?: string;
  };
}

interface ImportFilePreviewProps {
  data: ParsedData;
  fieldMapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  type: 'income' | 'expense';
}

const ImportFilePreview: React.FC<ImportFilePreviewProps> = ({
  data,
  fieldMapping,
  onMappingChange,
  type
}) => {
  const handleMappingChange = (csvColumn: string, systemField: string) => {
    const newMapping = { ...fieldMapping };
    
    // Remove this system field from other columns first
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key] === systemField && key !== csvColumn) {
        delete newMapping[key];
      }
    });
    
    if (systemField === 'none') {
      delete newMapping[csvColumn];
    } else {
      newMapping[csvColumn] = systemField;
    }
    
    onMappingChange(newMapping);
  };

  const getSystemFieldOptions = () => {
    const baseOptions = [
      { value: 'none', label: 'Do not import' },
      { value: 'amount', label: 'Amount *', required: true },
      { value: 'description', label: 'Description *', required: true },
      { value: 'date', label: 'Date' },
      { value: 'category', label: 'Category' },
      { value: 'recurring', label: 'Recurring' },
    ];

    if (type === 'expense') {
      baseOptions.splice(-1, 0, { value: 'vendor', label: 'Vendor' });
    }

    return baseOptions;
  };

  const systemFieldOptions = getSystemFieldOptions();
  const mappedFields = Object.values(fieldMapping);
  const requiredFields = ['amount', 'description'];
  const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));

  const getMappingStatus = (csvColumn: string) => {
    const systemField = fieldMapping[csvColumn];
    if (!systemField) return { status: 'unmapped', color: 'default' as const };
    
    const isRequired = requiredFields.includes(systemField);
    if (isRequired) return { status: 'required', color: 'success' as const };
    
    return { status: 'mapped', color: 'primary' as const };
  };

  const formatCellValue = (value: any, systemField?: string) => {
    if (!value) return '';
    
    switch (systemField) {
      case 'amount':
        const numValue = parseFloat(value.toString().replace(/[$,\s]/g, ''));
        return isNaN(numValue) ? value : `$${numValue.toFixed(2)}`;
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString();
      case 'recurring':
        const recStr = value.toString().toLowerCase();
        return ['true', 'yes', '1', 'y', 'on'].includes(recStr) ? 'Yes' : 'No';
      default:
        return value.toString();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Map File Columns to System Fields
      </Typography>
      
      <Typography variant="body2" color="text.secondary" mb={3}>
        Map each column from your file to the corresponding field in the system. 
        Fields marked with * are required.
      </Typography>

      {/* Mapping Status Alert */}
      {missingRequired.length > 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconAlertTriangle size={20} />
            Missing required field mappings: {missingRequired.join(', ')}
          </Box>
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconCheck size={20} />
            All required fields are mapped
          </Box>
        </Alert>
      )}

      {/* Field Mapping Section */}
      <Box mb={4}>
        <Typography variant="subtitle1" gutterBottom>
          Column Mapping
        </Typography>
        
        <Grid container spacing={2}>
          {data.headers.map((header) => {
            const status = getMappingStatus(header);
            const isDetected = Object.values(data.detectedColumns).includes(header);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={header}>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="subtitle2" noWrap>
                      {header}
                    </Typography>
                    {isDetected && (
                      <Chip 
                        label="Auto" 
                        size="small" 
                        color="info" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Maps to:
                    </Typography>
                    <IconArrowRight size={16} />
                  </Box>
                  
                  <TextField
                    fullWidth
                    size="small"
                    select
                    value={fieldMapping[header] || 'none'}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                  >
                    {systemFieldOptions.map((option) => (
                      <MenuItem 
                        key={option.value} 
                        value={option.value}
                        disabled={option.value !== 'none' && mappedFields.includes(option.value) && fieldMapping[header] !== option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  
                  {fieldMapping[header] && fieldMapping[header] !== 'none' && (
                    <Chip 
                      label={status.status} 
                      size="small" 
                      color={status.color}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Data Preview */}
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Data Preview ({data.totalRows} total rows)
        </Typography>
        
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Row</TableCell>
                {data.headers.map((header) => {
                  const systemField = fieldMapping[header];
                  const status = getMappingStatus(header);
                  
                  return (
                    <TableCell key={header}>
                      <Box>
                        <Typography variant="subtitle2" noWrap>
                          {header}
                        </Typography>
                        {systemField && systemField !== 'none' && (
                          <Chip 
                            label={systemField} 
                            size="small" 
                            color={status.color}
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.previewData.map((row, index) => (
                <TableRow key={index} hover>
                  <TableCell>{index + 2}</TableCell>
                  {data.headers.map((header) => {
                    const value = row[header];
                    const systemField = fieldMapping[header];
                    const formattedValue = formatCellValue(value, systemField);
                    
                    return (
                      <TableCell key={header}>
                        <Typography 
                          variant="body2" 
                          noWrap
                          color={!value ? 'text.secondary' : 'text.primary'}
                        >
                          {formattedValue || '(empty)'}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Showing first 5 rows. All {data.totalRows} rows will be processed during import.
        </Typography>
      </Box>

      {/* Sample Data Summary */}
      <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
        <Typography variant="subtitle2" gutterBottom>
          Sample Data Summary
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Total Rows
            </Typography>
            <Typography variant="h6">
              {data.totalRows}
            </Typography>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Mapped Columns
            </Typography>
            <Typography variant="h6">
              {Object.keys(fieldMapping).length}
            </Typography>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Required Fields
            </Typography>
            <Typography variant="h6" color={missingRequired.length > 0 ? 'error' : 'success'}>
              {requiredFields.length - missingRequired.length}/{requiredFields.length}
            </Typography>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Auto-Detected
            </Typography>
            <Typography variant="h6">
              {Object.values(data.detectedColumns).filter(Boolean).length}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ImportFilePreview;