'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Typography,
  Box,
  Button,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { IconInfoCircle, IconCheck, IconX } from '@tabler/icons-react';

interface FieldMappingTableProps {
  headers: string[];
  previewData: any[];
  onMappingChange: (mapping: { [key: string]: string }) => void;
  onProceed?: () => void;
}

// Available product fields that can be mapped (simplified)
const PRODUCT_FIELDS = [
  { value: '', label: 'Skip this column', required: false },
  { value: 'title', label: 'Product Title', required: true },
  { value: 'description', label: 'Description', required: true },
  { value: 'price', label: 'Price', required: true },
  { value: 'sku', label: 'SKU', required: false },
  { value: 'category', label: 'Category', required: true },
  { value: 'qty', label: 'Stock Quantity', required: false },
  { value: 'photo', label: 'Photo URL', required: true },
];

const FieldMappingTable: React.FC<FieldMappingTableProps> = ({
  headers,
  previewData,
  onMappingChange,
  onProceed,
}) => {
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [autoMappingApplied, setAutoMappingApplied] = useState(false);

  // Auto-mapping function
  const applyAutoMapping = () => {
    console.log('Applying auto-mapping for headers:', headers);
    const newMapping: { [key: string]: string } = {};
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Find the best match for this header
      const match = PRODUCT_FIELDS.find(field => {
        if (!field.value) return false;
        
        const fieldName = field.value.toLowerCase();
        const fieldLabel = field.label.toLowerCase();
        
        // Exact match
        if (normalizedHeader === fieldName || normalizedHeader === fieldLabel) {
          return true;
        }
        
        // Partial match
        if (normalizedHeader.includes(fieldName) || fieldName.includes(normalizedHeader)) {
          return true;
        }
        
        // Common variations (simplified)
        const variations: { [key: string]: string[] } = {
          'title': ['name', 'product_name', 'product_title', 'item_name'],
          'sku': ['product_sku', 'item_sku', 'code', 'product_code'],
          'price': ['cost', 'amount', 'regular_price', 'list_price'],
          'category': ['cat', 'product_category', 'category_name'],
          'description': ['desc', 'product_description', 'details'],
          'qty': ['stock', 'inventory', 'quantity', 'stock_quantity', 'in_stock'],
          'photo': ['image', 'img', 'image_url', 'picture', 'thumbnail'],
        };
        
        const fieldVariations = variations[fieldName] || [];
        return fieldVariations.some(variation => 
          normalizedHeader.includes(variation) || variation.includes(normalizedHeader)
        );
      });
      
      if (match) {
        console.log(`Auto-mapped "${header}" to "${match.value}"`);
        newMapping[header] = match.value;
      } else {
        console.log(`No match found for header: "${header}"`);
      }
    });
    
    console.log('Final auto-mapping result:', newMapping);
    setMapping(newMapping);
    setAutoMappingApplied(true);
  };

  // Apply auto-mapping on component mount
  useEffect(() => {
    if (!autoMappingApplied && headers.length > 0) {
      applyAutoMapping();
    }
  }, [headers, autoMappingApplied]);

  // Notify parent component when mapping changes
  useEffect(() => {
    console.log('Field mapping changed, notifying parent:', mapping);
    onMappingChange(mapping);
  }, [mapping, onMappingChange]);

  const handleMappingChange = (header: string, value: string) => {
    setMapping(prev => ({
      ...prev,
      [header]: value,
    }));
  };

  const getUsedFields = () => {
    return Object.values(mapping).filter(value => value !== '');
  };

  const getRequiredFields = () => {
    return PRODUCT_FIELDS.filter(field => field.required);
  };

  const getMappedRequiredFields = () => {
    const usedFields = getUsedFields();
    return getRequiredFields().filter(field => usedFields.includes(field.value));
  };

  const getMissingRequiredFields = () => {
    const mappedRequired = getMappedRequiredFields();
    return getRequiredFields().filter(field => 
      !mappedRequired.some(mapped => mapped.value === field.value)
    );
  };

  const isDuplicate = (header: string, value: string) => {
    if (!value) return false;
    return Object.entries(mapping).some(([key, val]) => 
      key !== header && val === value
    );
  };

  const canProceed = () => {
    const missingRequired = getMissingRequiredFields();
    const hasDuplicates = Object.entries(mapping).some(([header, value]) => 
      isDuplicate(header, value)
    );
    return missingRequired.length === 0 && !hasDuplicates;
  };

  const getFieldDescription = (fieldValue: string) => {
    const descriptions: { [key: string]: string } = {
      'name': 'The display name of the product',
      'sku': 'Unique product identifier (Stock Keeping Unit)',
      'price': 'Regular selling price in your default currency',
      'category': 'Product category or classification',
      'description': 'Detailed product description',
      'stock_quantity': 'Available inventory quantity',
      'weight': 'Product weight for shipping calculations',
      'dimensions': 'Product dimensions (length x width x height)',
      'brand': 'Product brand or manufacturer',
      'tags': 'Comma-separated tags for organization',
      'image_url': 'URL to product image',
      'status': 'Product status (active, draft, archived)',
      'featured': 'Whether product is featured (true/false)',
      'sale_price': 'Discounted price if on sale',
      'compare_at_price': 'Original price for comparison',
      'cost_price': 'Cost price for profit calculations',
      'barcode': 'Product barcode number',
      'vendor': 'Product vendor or supplier',
      'product_type': 'Type of product for organization',
      'visibility': 'Product visibility (public, private, hidden)',
      'tax_class': 'Tax classification for tax calculations',
      'shipping_class': 'Shipping class for shipping calculations',
      'meta_title': 'SEO meta title',
      'meta_description': 'SEO meta description',
    };
    return descriptions[fieldValue] || '';
  };

  return (
    <Box>
      {/* Status Alerts */}
      <Box mb={3}>
        {getMissingRequiredFields().length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Missing Required Fields:</strong>{' '}
              {getMissingRequiredFields().map(field => field.label).join(', ')}
            </Typography>
          </Alert>
        )}
        
        {Object.entries(mapping).some(([header, value]) => isDuplicate(header, value)) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Duplicate Field Mapping:</strong> Each product field can only be mapped once.
            </Typography>
          </Alert>
        )}
        
        {canProceed() && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Mapping Complete:</strong> All required fields are mapped. You can proceed to the next step.
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Auto-mapping Button */}
      <Box mb={3}>
        <Button
          variant="outlined"
          onClick={applyAutoMapping}
          startIcon={<IconCheck />}
        >
          Apply Auto-Mapping
        </Button>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Automatically map columns based on common field names
        </Typography>
      </Box>

      {/* Mapping Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>CSV Column</TableCell>
              <TableCell>Sample Data</TableCell>
              <TableCell>Map to Product Field</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {headers.map((header) => (
              <TableRow key={header}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    {header}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ maxWidth: 200 }}>
                    {previewData.slice(0, 3).map((row, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row[header] || '—'}
                      </Typography>
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={mapping[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      displayEmpty
                      error={isDuplicate(header, mapping[header])}
                    >
                      {PRODUCT_FIELDS.map((field) => (
                        <MenuItem 
                          key={field.value} 
                          value={field.value}
                          disabled={field.value !== '' && getUsedFields().includes(field.value) && mapping[header] !== field.value}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            {field.label}
                            {field.required && (
                              <Chip label="Required" size="small" color="error" />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {mapping[header] && mapping[header] !== '' && (
                    <Box mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        {getFieldDescription(mapping[header])}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {mapping[header] === '' ? (
                      <Chip label="Skipped" size="small" color="default" />
                    ) : isDuplicate(header, mapping[header]) ? (
                      <Chip label="Duplicate" size="small" color="error" icon={<IconX size={16} />} />
                    ) : (
                      <Chip label="Mapped" size="small" color="success" icon={<IconCheck size={16} />} />
                    )}
                    
                    {mapping[header] && getFieldDescription(mapping[header]) && (
                      <Tooltip title={getFieldDescription(mapping[header])}>
                        <IconInfoCircle size={16} color="gray" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mapping Summary */}
      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          Mapping Summary
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Box>
            <Typography variant="body2" color="text.secondary">
              Required Fields: {getMappedRequiredFields().length}/{getRequiredFields().length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Mapped: {getUsedFields().length}/{headers.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Skipped: {headers.length - getUsedFields().length}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Proceed Button */}
      <Box mt={3}>
        <Button
          variant="contained"
          disabled={!canProceed()}
          onClick={onProceed}
          size="large"
        >
          Proceed to Validation
        </Button>
      </Box>
    </Box>
  );
};

export default FieldMappingTable;