'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  IconDownload,
  IconFileText,
  IconInfoCircle,
  IconChevronDown,
  IconCheck,
  IconAlertTriangle,
  IconFileSpreadsheet
} from '@tabler/icons-react';

interface TemplateDownloadSectionProps {
  type: 'income' | 'expense';
}

interface TemplateInfo {
  filename: string;
  description: string;
  headers: string[];
  sampleRowCount: number;
  requiredFields: string[];
  validationRules: Record<string, any>;
  quickStartGuide: string[];
}

const TemplateDownloadSection: React.FC<TemplateDownloadSectionProps> = ({ type }) => {
  const [loading, setLoading] = useState(false);
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchTemplateInfo();
  }, [type]);

  const fetchTemplateInfo = async () => {
    try {
      const response = await fetch(`/api/finance/templates/${type}`, {
        method: 'OPTIONS'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTemplateInfo({
            ...result.data.templateInfo,
            requiredFields: result.data.requiredFields,
            validationRules: result.data.validationRules,
            quickStartGuide: ['Download template', 'Replace sample data', 'Save as CSV', 'Import file']
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch template info:', err);
    }
  };

  const handleDownloadTemplate = async (includeInstructions: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        format: 'csv',
        instructions: includeInstructions.toString()
      });

      const response = await fetch(`/api/finance/templates/${type}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = templateInfo?.filename || `${type}_template.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const getFieldDescription = (field: string) => {
    const descriptions: Record<string, string> = {
      date: 'Transaction date (YYYY-MM-DD format)',
      description: 'Brief description of the transaction',
      amount: 'Transaction amount (positive numbers only)',
      category: `${type} category (will be created if missing)`,
      vendor: 'Vendor or supplier name (for expenses)',
      recurring: 'Whether this is a recurring transaction (Yes/No)'
    };
    
    return descriptions[field.toLowerCase()] || field;
  };

  const getFieldExamples = (field: string) => {
    const examples: Record<string, string[]> = {
      date: ['2024-01-15', '2024-12-31'],
      description: ['Monthly rent payment', 'Freelance project fee'],
      amount: ['1234.56', '89.99'],
      category: type === 'income' 
        ? ['Consulting', 'Employment', 'Investments']
        : ['Office Expenses', 'Marketing', 'Travel'],
      vendor: ['Staples', 'Google', 'Adobe'],
      recurring: ['Yes', 'No']
    };
    
    return examples[field.toLowerCase()] || [];
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Download Import Template
      </Typography>
      
      <Typography variant="body2" color="text.secondary" mb={3}>
        Download a pre-formatted template to help you prepare your {type} data for import.
        The template includes sample data and detailed instructions.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Download Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <IconFileSpreadsheet size={24} color="green" />
            <Box>
              <Typography variant="subtitle1">
                {type.charAt(0).toUpperCase() + type.slice(1)} Import Template
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV template with sample data and instructions
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <IconDownload />}
                onClick={() => handleDownloadTemplate(true)}
                disabled={loading}
              >
                {loading ? 'Downloading...' : 'Download with Instructions'}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<IconDownload />}
                onClick={() => handleDownloadTemplate(false)}
                disabled={loading}
              >
                Download Clean Template
              </Button>
            </Grid>
          </Grid>

          {templateInfo && (
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="caption" color="text.secondary">
                Template includes {templateInfo.sampleRowCount} sample rows with {templateInfo.headers.length} columns
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<IconChevronDown />}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconCheck color="green" />
            <Typography variant="subtitle1">Quick Start Guide</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold" color="primary">1</Typography>
              </ListItemIcon>
              <ListItemText primary="Download the template file above" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold" color="primary">2</Typography>
              </ListItemIcon>
              <ListItemText primary="Open the template in Excel, Google Sheets, or any spreadsheet application" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold" color="primary">3</Typography>
              </ListItemIcon>
              <ListItemText primary="Replace the sample data with your actual financial records" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold" color="primary">4</Typography>
              </ListItemIcon>
              <ListItemText primary="Keep the header row (first row) unchanged" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold" color="primary">5</Typography>
              </ListItemIcon>
              <ListItemText primary="Save the file as CSV format" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold" color="primary">6</Typography>
              </ListItemIcon>
              <ListItemText primary="Upload your prepared file using the import feature" />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Field Descriptions */}
      {templateInfo && (
        <Accordion>
          <AccordionSummary expandIcon={<IconChevronDown />}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconInfoCircle color="blue" />
              <Typography variant="subtitle1">Field Descriptions</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {templateInfo.headers.map((header) => {
                const isRequired = templateInfo.requiredFields.includes(header.toLowerCase());
                const examples = getFieldExamples(header);
                
                return (
                  <Grid item xs={12} md={6} key={header}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="subtitle2">{header}</Typography>
                          <Chip 
                            label={isRequired ? 'Required' : 'Optional'} 
                            size="small" 
                            color={isRequired ? 'error' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {getFieldDescription(header)}
                        </Typography>
                        {examples.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Examples: {examples.join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Important Notes */}
      <Accordion>
        <AccordionSummary expandIcon={<IconChevronDown />}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconAlertTriangle color="orange" />
            <Typography variant="subtitle1">Important Notes</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Before importing:</Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="• Use the exact date format: YYYY-MM-DD (e.g., 2024-01-15)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Enter amounts as numbers only, no currency symbols" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Keep descriptions brief but descriptive" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Use 'Yes' or 'No' for recurring transactions" />
              </ListItem>
              {type === 'expense' && (
                <ListItem>
                  <ListItemText primary="• Either Category or Vendor should be specified for each expense" />
                </ListItem>
              )}
            </List>
          </Alert>

          <Alert severity="warning">
            <Typography variant="subtitle2" gutterBottom>File Requirements:</Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="• Maximum file size: 10MB" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Supported formats: CSV (.csv), Excel (.xls, .xlsx)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• UTF-8 encoding recommended for special characters" />
              </ListItem>
            </List>
          </Alert>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default TemplateDownloadSection;