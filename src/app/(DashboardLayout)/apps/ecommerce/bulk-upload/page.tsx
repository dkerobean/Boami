'use client';

import { useState } from 'react';
import { Grid, Box, Typography, Button, Card, CardContent, Stepper, Step, StepLabel, Alert } from '@mui/material';
import { IconUpload, IconDownload, IconFile, IconCheck } from '@tabler/icons-react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/app/components/shared/BlankCard';
import BulkUploadDropzone from '@/app/components/apps/ecommerce/bulkUpload/BulkUploadDropzone';
import ImportProgressTracker from '@/app/components/apps/ecommerce/bulkUpload/ImportProgressTracker';
import FieldMappingTable from '@/app/components/apps/ecommerce/bulkUpload/FieldMappingTable';

const BCrumb = [
  {
    to: '/dashboards/ecommerce',
    title: 'Dashboard',
  },
  {
    title: 'Bulk Upload',
  },
];

const steps = [
  'Upload File',
  'Map Fields',
  'Validate Data',
  'Import Products',
];

interface ImportJob {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
    percentage: number;
  };
  results: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: {
    row: number;
    field?: string;
    message: string;
  }[];
}

interface ParsedData {
  headers: string[];
  data: any[];
  totalRows: number;
  previewData: any[];
}

const BulkUploadPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<{ [key: string]: string }>({});
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = (file: File, data: ParsedData) => {
    setUploadedFile(file);
    setParsedData(data);
    setActiveStep(1);
  };

  const handleFieldMapping = (mapping: { [key: string]: string }) => {
    setFieldMapping(mapping);
  };

  const handleProceedToValidation = () => {
    setActiveStep(2);
  };

  const handleValidation = (errors: any[]) => {
    setValidationErrors(errors);
    if (errors.length === 0) {
      setActiveStep(3);
    }
  };

  const handleImport = async () => {
    if (!uploadedFile || !parsedData) return;
    
    setIsImporting(true);

    const initialJob: ImportJob = {
      id: `import_${Date.now()}`,
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size,
      status: 'processing',
      progress: {
        totalRows: parsedData.totalRows,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        percentage: 0,
      },
      results: {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      errors: [],
    };

    setImportJob(initialJob);
    setActiveStep(3); // Move to progress tracking step
    
    try {
      // Call the real import API
      const response = await fetch('/api/bulk-upload/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: parsedData.data,
          fieldMapping,
          options: {
            updateExisting: false,
            createCategories: true,
            skipInvalidRows: true,
          },
        }),
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        console.log('Error response:', errorResult);
        throw new Error(errorResult.error || errorResult.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API Response received:', result);
      
      if (result.success) {
        // Update job with real results
        setImportJob(prev => prev ? {
          ...prev,
          status: 'completed',
          progress: {
            totalRows: result.results.totalRows,
            processedRows: result.results.processed,
            successfulRows: result.results.created + result.results.updated,
            failedRows: result.results.failed,
            percentage: 100,
          },
          results: {
            created: result.results.created,
            updated: result.results.updated,
            skipped: result.results.skipped,
            failed: result.results.failed,
          },
          errors: result.results.errors?.map((err: any) => ({
            row: err.row,
            message: Array.isArray(err.errors) ? err.errors.join(', ') : err.errors || err.message || 'Unknown error',
          })) || [],
        } : null);
      } else {
        // Handle API error
        console.log('API returned error:', result);
        setImportJob(prev => prev ? {
          ...prev,
          status: 'failed',
          errors: [{
            row: 0,
            message: result.error || result.message || 'Import failed',
          }],
        } : null);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportJob(prev => prev ? {
        ...prev,
        status: 'failed',
        errors: [{
          row: 0,
          message: 'Network error occurred during import',
        }],
      } : null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setUploadedFile(null);
    setParsedData(null);
    setFieldMapping({});
    setImportJob(null);
    setValidationErrors([]);
    setIsImporting(false);
  };

  const downloadTemplate = () => {
    // Simplified template with essential fields only
    const template = `title,description,price,sku,category,qty,photo
"Premium Wireless Headphones","High-quality wireless headphones with noise cancellation and 30-hour battery life",299.99,"WH-001","Electronics",50,"https://images.unsplash.com/photo-1505740420928-5e560c06d30e"
"Bluetooth Portable Speaker","Compact wireless speaker with powerful bass and waterproof design",99.99,"SPK-002","Electronics",25,"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1"
"Gaming Mouse","High-precision gaming mouse with RGB lighting and programmable buttons",79.99,"GM-003","Accessories",75,"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <PageContainer title="Bulk Upload" description="Import products from CSV or Excel files">
      <Breadcrumb title="Bulk Upload" items={BCrumb} />
      
      {/* Progress Stepper */}
      <Box mb={4}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Template Download */}
      <Box mb={3}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            New to bulk uploads? Download our CSV template to get started with the correct format.
          </Typography>
        </Alert>
        <Button
          variant="outlined"
          startIcon={<IconDownload />}
          onClick={downloadTemplate}
          sx={{ mb: 2 }}
        >
          Download CSV Template
        </Button>
      </Box>

      {/* Step Content */}
      <Box>
        {activeStep === 0 && (
          <BlankCard>
            <CardContent>
              <Typography variant="h5" mb={3}>
                Upload Product File
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Upload a CSV or Excel file containing your product data. The file should include product information like names, SKUs, prices, and inventory levels.
              </Typography>
              <BulkUploadDropzone onFileUpload={handleFileUpload} />
            </CardContent>
          </BlankCard>
        )}

        {activeStep === 1 && parsedData && (
          <BlankCard>
            <CardContent>
              <Typography variant="h5" mb={3}>
                Map Fields
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Map the columns from your file to the corresponding product fields in our system.
              </Typography>
              <FieldMappingTable
                headers={parsedData.headers}
                previewData={parsedData.previewData}
                onMappingChange={handleFieldMapping}
                onProceed={handleProceedToValidation}
              />
            </CardContent>
          </BlankCard>
        )}

        {activeStep === 2 && parsedData && (
          <BlankCard>
            <CardContent>
              <Typography variant="h5" mb={3}>
                Validate Data
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Review your data for any validation errors before importing.
              </Typography>
              
              {validationErrors.length > 0 ? (
                <Box>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Found {validationErrors.length} validation errors. Please fix them before proceeding.
                  </Alert>
                  {/* Add validation error display here */}
                </Box>
              ) : (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconCheck size={20} />
                      <Typography>
                        All data validated successfully! Ready to import {parsedData.totalRows} products.
                      </Typography>
                    </Box>
                  </Alert>
                  <Button
                    variant="contained"
                    onClick={handleImport}
                    startIcon={<IconUpload />}
                    size="large"
                    disabled={isImporting}
                  >
                    {isImporting ? 'Starting Import...' : 'Start Import'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </BlankCard>
        )}

        {activeStep === 3 && importJob && (
          <BlankCard>
            <CardContent>
              <Typography variant="h5" mb={3}>
                Import Progress
              </Typography>
              <ImportProgressTracker importJob={importJob} />
              
              {importJob.status === 'completed' && (
                <Box mt={3}>
                  <Button
                    variant="contained"
                    onClick={handleReset}
                    startIcon={<IconUpload />}
                  >
                    Import Another File
                  </Button>
                </Box>
              )}
            </CardContent>
          </BlankCard>
        )}
      </Box>

      {/* Import History */}
      <Box mt={4}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={3}>
              Recent Imports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your import history will appear here. Track the status of your recent bulk uploads and download error reports.
            </Typography>
          </CardContent>
        </BlankCard>
      </Box>
    </PageContainer>
  );
};

export default BulkUploadPage;