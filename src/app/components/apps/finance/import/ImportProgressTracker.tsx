'use client';

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import { 
  IconClock, 
  IconCheck, 
  IconX, 
  IconLoader, 
  IconFileText,
  IconTrendingUp
} from '@tabler/icons-react';

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

interface ImportProgressTrackerProps {
  job: ImportJob;
}

const ImportProgressTracker: React.FC<ImportProgressTrackerProps> = ({ job }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <IconClock size={20} color="orange" />;
      case 'processing':
        return <IconLoader size={20} color="blue" className="animate-spin" />;
      case 'completed':
        return <IconCheck size={20} color="green" />;
      case 'failed':
        return <IconX size={20} color="red" />;
      default:
        return <IconClock size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'Calculating...';
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getProgressColor = () => {
    if (job.status === 'failed') return 'error';
    if (job.status === 'completed') return 'success';
    return 'primary';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import Progress
      </Typography>
      
      {/* Status Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        {getStatusIcon()}
        <Typography variant="h6">
          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
        </Typography>
        <Chip 
          label={`Job ID: ${job.jobId.split('_').pop()}`} 
          size="small" 
          variant="outlined" 
        />
      </Box>

      {/* Progress Bar */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Processing rows...
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {job.processedRows} / {job.totalRows} ({job.progress.percentage}%)
          </Typography>
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={job.progress.percentage}
          color={getProgressColor()}
          sx={{ height: 8, borderRadius: 4 }}
        />
        
        {job.status === 'processing' && job.progress.estimatedTimeRemaining && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Estimated time remaining: {formatTime(job.progress.estimatedTimeRemaining)}
          </Typography>
        )}
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <IconCheck size={24} color="green" />
              <Typography variant="h6" color="success.main">
                {job.successfulRows}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Successful
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <IconX size={24} color="red" />
              <Typography variant="h6" color="error.main">
                {job.failedRows}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <IconTrendingUp size={24} color="blue" />
              <Typography variant="h6" color="primary.main">
                {job.results.created}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <IconFileText size={24} color="orange" />
              <Typography variant="h6" color="warning.main">
                {job.results.skipped}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Skipped
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Real-time Errors */}
      {job.errors.length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Recent Errors ({job.errors.length})
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {job.errors.slice(-5).map((error, index) => (
              <Alert key={index} severity="error" sx={{ mb: 1 }}>
                <Typography variant="caption">
                  Row {error.row} - {error.field}: {error.message}
                </Typography>
              </Alert>
            ))}
          </Box>
          {job.errors.length > 5 && (
            <Typography variant="caption" color="text.secondary">
              Showing latest 5 errors. Total: {job.errors.length}
            </Typography>
          )}
        </Box>
      )}

      {/* Real-time Warnings */}
      {job.warnings.length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Warnings ({job.warnings.length})
          </Typography>
          <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
            {job.warnings.slice(-3).map((warning, index) => (
              <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                <Typography variant="caption">
                  Row {warning.row} - {warning.field}: {warning.message}
                </Typography>
              </Alert>
            ))}
          </Box>
          {job.warnings.length > 3 && (
            <Typography variant="caption" color="text.secondary">
              Showing latest 3 warnings. Total: {job.warnings.length}
            </Typography>
          )}
        </Box>
      )}

      {/* Processing Status Messages */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Status Updates
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Chip 
              label={job.status} 
              color={getStatusColor() as any} 
              size="small" 
            />
            <Typography variant="body2">
              {job.status === 'pending' && 'Initializing import process...'}
              {job.status === 'processing' && `Processing row ${job.processedRows} of ${job.totalRows}...`}
              {job.status === 'completed' && 'Import completed successfully!'}
              {job.status === 'failed' && 'Import failed. Please check the errors above.'}
            </Typography>
          </Box>
          
          {job.status === 'processing' && (
            <>
              <Typography variant="caption" color="text.secondary" display="block">
                • Validating data format and requirements
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                • Creating missing categories and vendors (if enabled)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                • Inserting records into database
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Live Statistics */}
      <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
        <Typography variant="subtitle2" gutterBottom>
          Live Statistics
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Success Rate
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {job.totalRows > 0 
                ? `${Math.round((job.successfulRows / job.processedRows) * 100)}%`
                : '0%'
              }
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Error Rate
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {job.totalRows > 0 
                ? `${Math.round((job.failedRows / job.processedRows) * 100)}%`
                : '0%'
              }
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Records/Second
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {job.processedRows > 0 ? '~5-10' : '0'}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Remaining
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {job.totalRows - job.processedRows}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ImportProgressTracker;