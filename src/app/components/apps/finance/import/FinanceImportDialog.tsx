'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { IconX, IconUpload, IconFileImport } from '@tabler/icons-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import ImportFilePreview from './ImportFilePreview';
import ImportProgressTracker from './ImportProgressTracker';
import ImportResults from './ImportResults';
import TemplateDownloadSection from './TemplateDownloadSection';

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

interface FinanceImportDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'income' | 'expense';
  onSuccess?: () => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

interface ImportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  progress: {
    percentage: number;
    estimatedTimeRemaining?: number;
  };
  results: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

const steps = ['Upload File', 'Map Fields', 'Review & Import', 'Complete'];

const FinanceImportDialog: React.FC<FinanceImportDialogProps> = ({
  open,
  onClose,
  type,
  onSuccess
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importOptions, setImportOptions] = useState({
    createCategories: true,
    createVendors: type === 'expense',
    skipInvalidRows: true,
    updateExisting: false
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const handleClose = () => {
    // Reset state
    setActiveStep(0);
    setParsedData(null);
    setFieldMapping({});
    setValidation(null);
    setImportJob(null);
    setError(null);
    setTabValue(0);
    onClose();
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    
    const hasValidType = allowedTypes.includes(file.type);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidType && !hasValidExtension) {
      return 'Invalid file type. Please upload a CSV or Excel file.';
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size too large. Maximum size is 10MB.';
    }
    
    return null;
  };

  const parseFile = async (file: File): Promise<ParsedData> => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      return parseCSVFile(file);
    } else {
      return parseExcelFile(file);
    }
  };

  const parseCSVFile = (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results) => {
          try {
            const data = results.data as any[];
            const headers = results.meta.fields || [];
            
            if (headers.length === 0) throw new Error('No headers found');
            if (data.length === 0) throw new Error('No data rows found');
            
            const detectedColumns = detectColumns(headers);
            const previewData = data.slice(0, 5);
            
            resolve({
              headers,
              data,
              totalRows: data.length,
              previewData,
              detectedColumns
            });
          } catch (error) {
            reject(error);
          }
        },
        error: reject
      });
    });
  };

  const parseExcelFile = (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) throw new Error('No worksheets found');
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false 
          }) as any[][];
          
          if (jsonData.length === 0) throw new Error('No data found');
          
          const headers = jsonData[0].map((h: any) => String(h).trim()).filter(Boolean);
          if (headers.length === 0) throw new Error('No headers found');
          
          const dataRows = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] ? String(row[index]).trim() : '';
            });
            return obj;
          }).filter(row => Object.values(row).some(val => val !== ''));
          
          if (dataRows.length === 0) throw new Error('No data rows found');
          
          const detectedColumns = detectColumns(headers);
          const previewData = dataRows.slice(0, 5);
          
          resolve({
            headers,
            data: dataRows,
            totalRows: dataRows.length,
            previewData,
            detectedColumns
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const detectColumns = (headers: string[]) => {
    const detected: ParsedData['detectedColumns'] = {};
    const lowercase = headers.map(h => h.toLowerCase());
    
    const findPattern = (patterns: string[]) => {
      for (const pattern of patterns) {
        const index = lowercase.findIndex(h => h.includes(pattern));
        if (index !== -1) return headers[index];
      }
      return undefined;
    };
    
    detected.date = findPattern(['date', 'transaction date', 'created_at']);
    detected.description = findPattern(['description', 'memo', 'details', 'note']);
    detected.amount = findPattern(['amount', 'value', 'price', 'total', 'cost']);
    detected.category = findPattern(['category', 'type', 'classification']);
    detected.vendor = findPattern(['vendor', 'supplier', 'merchant', 'payee']);
    detected.recurring = findPattern(['recurring', 'repeat', 'is_recurring']);
    
    return detected;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsed = await parseFile(file);
      setParsedData(parsed);
      
      // Auto-setup field mapping based on detected columns
      const autoMapping: Record<string, string> = {};
      Object.entries(parsed.detectedColumns).forEach(([field, header]) => {
        if (header) {
          autoMapping[header] = field;
        }
      });
      setFieldMapping(autoMapping);
      
      setActiveStep(1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleValidateData = async () => {
    if (!parsedData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/finance/${type === 'expense' ? 'expenses' : type}/import`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data: parsedData.data.filter(row => {
            // Filter out completely empty rows
            return Object.values(row).some(value => 
              value !== null && 
              value !== undefined && 
              value.toString().trim() !== ''
            );
          }),
          mapping: fieldMapping
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Validation failed');
      }

      setValidation(result.data.validation);
      setActiveStep(2);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartImport = async () => {
    if (!parsedData || !validation) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/finance/${type === 'expense' ? 'expenses' : type}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data: parsedData.data.filter(row => {
            // Filter out completely empty rows
            return Object.values(row).some(value => 
              value !== null && 
              value !== undefined && 
              value.toString().trim() !== ''
            );
          }),
          mapping: fieldMapping,
          options: importOptions
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Import failed');
      }

      // Start polling for job status
      const jobId = result.data.jobId;
      setImportJob({
        jobId,
        status: 'pending',
        totalRows: parsedData.totalRows,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        progress: { percentage: 0 },
        results: { created: 0, updated: 0, skipped: 0, failed: 0 },
        errors: [],
        warnings: []
      });
      
      setActiveStep(3);
      pollJobStatus(jobId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/finance/import/${jobId}`, {
          credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
          setImportJob(result.data);
          
          if (result.data.status === 'completed') {
            onSuccess?.();
            return; // Stop polling
          } else if (result.data.status === 'failed') {
            setError('Import job failed');
            return; // Stop polling
          }
        }

        // Continue polling if still processing
        if (result.data?.status === 'processing' || result.data?.status === 'pending') {
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
        setTimeout(poll, 5000); // Retry after 5 seconds on error
      }
    };

    poll();
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return parsedData !== null;
      case 1:
        const requiredFields = ['amount', 'description'];
        const mappedFields = Object.values(fieldMapping);
        return requiredFields.every(field => mappedFields.includes(field));
      case 2:
        return validation !== null;
      default:
        return false;
    }
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload {type === 'income' ? 'Income' : 'Expense'} File
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Upload a CSV or Excel file containing your {type} data. 
              Required columns: Amount, Description. 
              Optional: Date, Category{type === 'expense' ? ', Vendor' : ''}, Recurring.
            </Typography>

            {!parsedData ? (
              <>
                {/* Template Download Section */}
                <Box mb={4}>
                  <TemplateDownloadSection type={type} />
                </Box>

                {/* File Upload Section */}
                <Box
                  {...getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <input {...getInputProps()} />
                  <IconUpload size={48} color="gray" />
                  <Typography variant="h6" mt={2}>
                    {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    or click to browse files
                  </Typography>
                  <Button variant="outlined" sx={{ mt: 2 }}>
                    Choose File
                  </Button>
                  <Typography variant="caption" display="block" mt={2} color="text.secondary">
                    Supported formats: CSV, XLS, XLSX (max 10MB)
                  </Typography>
                </Box>
              </>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                File parsed successfully! Found {parsedData.totalRows} rows.
              </Alert>
            )}
          </Box>
        );

      case 1:
        return parsedData ? (
          <ImportFilePreview
            data={parsedData}
            fieldMapping={fieldMapping}
            onMappingChange={setFieldMapping}
            type={type}
          />
        ) : null;

      case 2:
        return validation ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Import Data
            </Typography>
            
            {validation.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Found {validation.errors.length} error(s) in your data.
                {importOptions.skipInvalidRows ? ' Invalid rows will be skipped.' : ' Please fix errors before importing.'}
              </Alert>
            )}
            
            {validation.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {validation.warnings.length} warning(s) in your data.
              </Alert>
            )}

            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
              <Tab label="Import Options" />
              <Tab label={`Errors (${validation.errors.length})`} />
              <Tab label={`Warnings (${validation.warnings.length})`} />
            </Tabs>

            {tabValue === 0 && (
              <Box>
                {/* Import options would go here */}
                <Typography>Ready to import {parsedData?.totalRows} rows.</Typography>
              </Box>
            )}

            {tabValue === 1 && (
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {validation.errors.map((error, index) => (
                  <Alert key={index} severity="error" sx={{ mb: 1 }}>
                    Row {error.row}: {error.message}
                  </Alert>
                ))}
              </Box>
            )}

            {tabValue === 2 && (
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {validation.warnings.map((warning, index) => (
                  <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                    Row {warning.row}: {warning.message}
                  </Alert>
                ))}
              </Box>
            )}
          </Box>
        ) : null;

      case 3:
        return importJob ? (
          importJob.status === 'completed' ? (
            <ImportResults job={importJob} type={type} />
          ) : (
            <ImportProgressTracker job={importJob} />
          )
        ) : null;

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconFileImport />
          <Typography variant="h6">
            Import {type === 'income' ? 'Income' : 'Expense'} Data
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <IconX />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ width: '100%', mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {!loading && getStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        
        {activeStep > 0 && activeStep < 3 && (
          <Button 
            onClick={() => setActiveStep(activeStep - 1)}
            disabled={loading}
          >
            Back
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleValidateData}
            disabled={!canProceed() || loading}
          >
            Validate Data
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={handleStartImport}
            disabled={!canProceed() || loading}
          >
            Start Import
          </Button>
        )}

        {activeStep === 3 && importJob?.status === 'completed' && (
          <Button
            variant="contained"
            onClick={handleClose}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FinanceImportDialog;