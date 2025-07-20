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

  const handleFileUpload = (file: File, data: ParsedData) => {
    setUploadedFile(file);
    setParsedData(data);
    setActiveStep(1);
  };

  const handleFieldMapping = (mapping: { [key: string]: string }) => {
    setFieldMapping(mapping);
    setActiveStep(2);
  };

  const handleValidation = (errors: any[]) => {
    setValidationErrors(errors);
    if (errors.length === 0) {
      setActiveStep(3);
    }
  };

  const handleImport = () => {
    if (!uploadedFile || !parsedData) return;

    const mockJob: ImportJob = {
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

    setImportJob(mockJob);
    
    // Simulate import progress
    const interval = setInterval(() => {
      setImportJob(prev => {
        if (!prev) return null;
        
        const newProcessed = Math.min(prev.progress.processedRows + 10, prev.progress.totalRows);
        const newSuccessful = Math.floor(newProcessed * 0.9);
        const newFailed = newProcessed - newSuccessful;
        const percentage = Math.round((newProcessed / prev.progress.totalRows) * 100);
        
        const isComplete = newProcessed >= prev.progress.totalRows;
        
        if (isComplete) {
          clearInterval(interval);
        }
        
        return {
          ...prev,
          status: isComplete ? 'completed' : 'processing',
          progress: {
            ...prev.progress,
            processedRows: newProcessed,
            successfulRows: newSuccessful,
            failedRows: newFailed,
            percentage,
          },
          results: {
            created: Math.floor(newSuccessful * 0.7),
            updated: Math.floor(newSuccessful * 0.3),
            skipped: Math.floor(newFailed * 0.5),
            failed: Math.floor(newFailed * 0.5),
          },
        };
      });
    }, 500);
  };

  const handleReset = () => {
    setActiveStep(0);
    setUploadedFile(null);
    setParsedData(null);
    setFieldMapping({});
    setImportJob(null);
    setValidationErrors([]);
  };

  const downloadTemplate = () => {
    const template = `Name,SKU,Price,Category,Description,Stock Quantity,Weight,Dimensions,Brand,Tags
"Premium Headphones","WH-001",299.99,"Electronics","High-quality wireless headphones",50,0.5,"20x15x8cm","AudioTech","wireless,bluetooth,premium"
"Bluetooth Speaker","SPK-002",99.99,"Electronics","Portable wireless speaker",25,0.8,"15x10x6cm","SoundMax","portable,bluetooth,speaker"`;
    
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
                  >
                    Start Import
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