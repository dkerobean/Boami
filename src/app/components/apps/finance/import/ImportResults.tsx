'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  IconCheck, 
  IconX, 
  IconAlertTriangle,
  IconDownload,
  IconChevronDown,
  IconTrendingUp,
  IconFileText,
  IconRefresh,
  IconCalendar
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
  createdAt?: Date;
  completedAt?: Date;
}

interface ImportResultsProps {
  job: ImportJob;
  type: 'income' | 'expense';
}

const ImportResults: React.FC<ImportResultsProps> = ({ job, type }) => {
  const [downloadingReport, setDownloadingReport] = useState(false);

  const getSuccessRate = () => {
    if (job.totalRows === 0) return 0;
    return Math.round((job.successfulRows / job.totalRows) * 100);
  };

  const getErrorRate = () => {
    if (job.totalRows === 0) return 0;
    return Math.round((job.failedRows / job.totalRows) * 100);
  };

  const getProcessingTime = () => {
    if (!job.createdAt || !job.completedAt) return 'Unknown';
    
    const startTime = new Date(job.createdAt).getTime();
    const endTime = new Date(job.completedAt).getTime();
    const durationMs = endTime - startTime;
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${Math.round(durationMs / 1000)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    
    try {
      // Generate report data
      const reportData = {
        importSummary: {
          jobId: job.jobId,
          type: type,
          status: job.status,
          totalRows: job.totalRows,
          processedRows: job.processedRows,
          successfulRows: job.successfulRows,
          failedRows: job.failedRows,
          successRate: getSuccessRate(),
          errorRate: getErrorRate(),
          processingTime: getProcessingTime(),
          startTime: job.createdAt,
          endTime: job.completedAt
        },
        results: job.results,
        errors: job.errors,
        warnings: job.warnings
      };

      // Create and download CSV report
      const csvContent = generateCSVReport(reportData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${type}_import_report_${job.jobId.split('_').pop()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Failed to download report:', error);
    } finally {
      setDownloadingReport(false);
    }
  };

  const generateCSVReport = (data: any) => {
    const lines = [
      '=== IMPORT SUMMARY ===',
      `Job ID,${data.importSummary.jobId}`,
      `Type,${data.importSummary.type}`,
      `Status,${data.importSummary.status}`,
      `Total Rows,${data.importSummary.totalRows}`,
      `Successful Rows,${data.importSummary.successfulRows}`,
      `Failed Rows,${data.importSummary.failedRows}`,
      `Success Rate,${data.importSummary.successRate}%`,
      `Processing Time,${data.importSummary.processingTime}`,
      '',
      '=== RESULTS BREAKDOWN ===',
      `Created,${data.results.created}`,
      `Updated,${data.results.updated}`,
      `Skipped,${data.results.skipped}`,
      `Failed,${data.results.failed}`,
      '',
      '=== ERRORS ===',
      'Row,Field,Message'
    ];

    data.errors.forEach((error: any) => {
      lines.push(`${error.row},${error.field},"${error.message}"`);
    });

    if (data.warnings.length > 0) {
      lines.push('', '=== WARNINGS ===', 'Row,Field,Message');
      data.warnings.forEach((warning: any) => {
        lines.push(`${warning.row},${warning.field},"${warning.message}"`);
      });
    }

    return lines.join('\n');
  };

  return (
    <Box>
      {/* Success Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconCheck size={32} color="green" />
        <Box>
          <Typography variant="h5" color="success.main">
            Import Completed!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your {type} data has been successfully imported
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <IconTrendingUp size={32} color="green" />
              <Typography variant="h4" color="success.main" mt={1}>
                {job.successfulRows}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Records Created
              </Typography>
              <Typography variant="caption" color="success.main">
                {getSuccessRate()}% success rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <IconX size={32} color="red" />
              <Typography variant="h4" color="error.main" mt={1}>
                {job.failedRows}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Failed Records
              </Typography>
              <Typography variant="caption" color="error.main">
                {getErrorRate()}% error rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <IconFileText size={32} color="blue" />
              <Typography variant="h4" color="primary.main" mt={1}>
                {job.totalRows}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Processed
              </Typography>
              <Typography variant="caption" color="primary.main">
                100% completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <IconCalendar size={32} color="orange" />
              <Typography variant="h4" color="warning.main" mt={1}>
                {getProcessingTime()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processing Time
              </Typography>
              <Typography variant="caption" color="warning.main">
                Time taken
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Results */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Import Details
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Operations Performed
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                  <Chip 
                    label={`${job.results.created} Created`} 
                    color="success" 
                    size="small"
                    icon={<IconTrendingUp size={16} />}
                  />
                  {job.results.updated > 0 && (
                    <Chip 
                      label={`${job.results.updated} Updated`} 
                      color="info" 
                      size="small"
                      icon={<IconRefresh size={16} />}
                    />
                  )}
                  {job.results.skipped > 0 && (
                    <Chip 
                      label={`${job.results.skipped} Skipped`} 
                      color="warning" 
                      size="small"
                      icon={<IconAlertTriangle size={16} />}
                    />
                  )}
                  {job.results.failed > 0 && (
                    <Chip 
                      label={`${job.results.failed} Failed`} 
                      color="error" 
                      size="small"
                      icon={<IconX size={16} />}
                    />
                  )}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Job Information
                </Typography>
                <Typography variant="body2" mt={1}>
                  Job ID: {job.jobId.split('_').pop()}
                </Typography>
                <Typography variant="body2">
                  Status: <Chip label={job.status} color="success" size="small" />
                </Typography>
                {job.completedAt && (
                  <Typography variant="body2">
                    Completed: {new Date(job.completedAt).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={downloadingReport ? <CircularProgress size={16} /> : <IconDownload />}
              onClick={handleDownloadReport}
              disabled={downloadingReport}
            >
              {downloadingReport ? 'Generating...' : 'Download Report'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Errors Section */}
      {job.errors.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<IconChevronDown />}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconX color="red" />
              <Typography variant="subtitle1">
                Errors ({job.errors.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Error Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {job.errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell>
                        <Chip label={error.field} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Warnings Section */}
      {job.warnings.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<IconChevronDown />}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconAlertTriangle color="orange" />
              <Typography variant="subtitle1">
                Warnings ({job.warnings.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Warning Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {job.warnings.map((warning, index) => (
                    <TableRow key={index}>
                      <TableCell>{warning.row}</TableCell>
                      <TableCell>
                        <Chip label={warning.field} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{warning.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Success Message */}
      {job.successfulRows > 0 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle2">
            Import completed successfully!
          </Typography>
          <Typography variant="body2">
            {job.successfulRows} {type} record(s) have been imported into your account. 
            You can now view them in your {type} list.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ImportResults;