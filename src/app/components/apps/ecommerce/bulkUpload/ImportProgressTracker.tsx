'use client';

import React from 'react';
import { Box, Typography, LinearProgress, Grid, Card, CardContent, Chip, Alert, Button } from '@mui/material';
import { IconCheck, IconX, IconAlertCircle, IconDownload, IconRefresh } from '@tabler/icons-react';

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

interface ImportProgressTrackerProps {
  importJob: ImportJob;
  onRetry?: () => void;
  onDownloadErrorReport?: () => void;
}

const ImportProgressTracker: React.FC<ImportProgressTrackerProps> = ({
  importJob,
  onRetry,
  onDownloadErrorReport,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <IconCheck size={20} />;
      case 'failed':
        return <IconX size={20} />;
      case 'processing':
        return <IconAlertCircle size={20} />;
      default:
        return <IconAlertCircle size={20} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadErrorReport = () => {
    if (importJob.errors.length === 0) return;
    
    const errorReport = [
      ['Row', 'Field', 'Error Message'],
      ...importJob.errors.map(error => [
        error.row.toString(),
        error.field || 'N/A',
        error.message
      ])
    ];
    
    const csvContent = errorReport.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${importJob.id}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    if (onDownloadErrorReport) {
      onDownloadErrorReport();
    }
  };

  return (
    <Box>
      {/* Job Overview */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              {importJob.fileName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              File Size: {formatFileSize(importJob.fileSize)} • Job ID: {importJob.id}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} textAlign="right">
            <Chip
              label={importJob.status.charAt(0).toUpperCase() + importJob.status.slice(1)}
              color={getStatusColor(importJob.status) as any}
              icon={getStatusIcon(importJob.status)}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Progress Bar */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="body2" fontWeight="medium">
            Import Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {importJob.progress.processedRows} / {importJob.progress.totalRows} rows
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={importJob.progress.percentage}
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
          {importJob.progress.percentage}% Complete
        </Typography>
      </Box>

      {/* Results Summary */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {importJob.results.created}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main">
                {importJob.results.updated}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {importJob.results.skipped}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Skipped
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {importJob.results.failed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Messages */}
      {importJob.status === 'processing' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Import is currently in progress. Please don't close this window.
          </Typography>
        </Alert>
      )}

      {importJob.status === 'completed' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Import completed successfully! {importJob.progress.successfulRows} rows were processed successfully.
            {importJob.results.failed > 0 && (
              <> {importJob.results.failed} rows failed to import.</>
            )}
          </Typography>
        </Alert>
      )}

      {importJob.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Import failed. Please check the error report for details.
          </Typography>
        </Alert>
      )}

      {/* Error Report */}
      {importJob.errors.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Error Report ({importJob.errors.length} errors)
          </Typography>
          <Box 
            sx={{ 
              maxHeight: 200, 
              overflow: 'auto', 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              bgcolor: 'background.paper',
            }}
          >
            {importJob.errors.slice(0, 10).map((error, index) => (
              <Box key={index} mb={1}>
                <Typography variant="caption" color="error">
                  Row {error.row}
                  {error.field && ` - ${error.field}`}: {error.message}
                </Typography>
              </Box>
            ))}
            {importJob.errors.length > 10 && (
              <Typography variant="caption" color="text.secondary">
                ... and {importJob.errors.length - 10} more errors
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={2} flexWrap="wrap">
        {importJob.errors.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<IconDownload />}
            onClick={downloadErrorReport}
          >
            Download Error Report
          </Button>
        )}
        
        {importJob.status === 'failed' && onRetry && (
          <Button
            variant="outlined"
            startIcon={<IconRefresh />}
            onClick={onRetry}
          >
            Retry Import
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ImportProgressTracker;