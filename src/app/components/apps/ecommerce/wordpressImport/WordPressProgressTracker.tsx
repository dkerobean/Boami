'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconChevronDown,
  IconDownload,
  IconRefresh,
  IconInfoCircle,
  IconTrendingUp,
  IconExternalLink
} from '@tabler/icons-react';

interface Connection {
  _id: string;
  name: string;
  siteUrl: string;
}

interface ImportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    currentStep: string;
  };
  errors?: Array<{
    level: string;
    message: string;
    productId?: number;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

interface WordPressProgressTrackerProps {
  job: ImportJob | null;
  connection: Connection | null;
  showResults?: boolean;
}

const WordPressProgressTracker: React.FC<WordPressProgressTrackerProps> = ({
  job,
  connection,
  showResults = false
}) => {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<any>(null);

  if (!job) {
    return (
      <Alert severity="info">
        Configure your import settings and click "Start Import" to begin.
      </Alert>
    );
  }

  const getProgressPercentage = () => {
    if (job.progress.total === 0) return 0;
    return Math.round((job.progress.processed / job.progress.total) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <IconCheck size={20} />;
      case 'failed': return <IconX size={20} />;
      case 'processing': return <IconRefresh size={20} className="animate-spin" />;
      case 'pending': return <IconClock size={20} />;
      default: return <IconInfoCircle size={20} />;
    }
  };

  const handleErrorClick = (error: any) => {
    setSelectedError(error);
    setErrorDialogOpen(true);
  };

  const formatDuration = (start: Date, end?: Date) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          {showResults ? 'Import Results' : 'Import Progress'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {showResults 
            ? `Import from ${connection?.name} has ${job.status}`
            : `Importing products from ${connection?.name}`
          }
        </Typography>
      </Box>

      {/* Status Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              {getStatusIcon(job.status)}
              <Box>
                <Typography variant="h6">
                  Import {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Job ID: {job.jobId}
                </Typography>
              </Box>
            </Box>
            <Chip 
              label={job.status.toUpperCase()} 
              color={getStatusColor(job.status)} 
              variant="filled"
            />
          </Box>

          {/* Progress Bar */}
          {(job.status === 'processing' || job.status === 'pending') && (
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  {job.progress.currentStep}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getProgressPercentage()}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getProgressPercentage()}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {job.progress.processed} of {job.progress.total} processed
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Duration: {formatDuration(job.createdAt, job.completedAt)}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Summary Stats */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {job.progress.imported}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Imported
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {job.progress.updated}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Updated
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {job.progress.skipped}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Skipped
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="error.main">
                  {job.progress.failed}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Detailed Results - Only show when completed or if there are errors */}
      {(showResults || (job.errors && job.errors.length > 0)) && (
        <>
          {/* Success Summary */}
          {job.status === 'completed' && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Import completed successfully!
                </Typography>
                <Typography variant="body2">
                  {job.progress.imported} products imported, {job.progress.updated} updated
                  {job.progress.skipped > 0 && `, ${job.progress.skipped} skipped`}
                  {job.progress.failed > 0 && `, ${job.progress.failed} failed`}
                </Typography>
                {job.completedAt && (
                  <Typography variant="body2">
                    Total time: {formatDuration(job.createdAt, job.completedAt)}
                  </Typography>
                )}
              </Box>
            </Alert>
          )}

          {/* Error Summary */}
          {job.status === 'failed' && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Import failed
              </Typography>
              <Typography variant="body2">
                The import process encountered a critical error and could not continue.
              </Typography>
            </Alert>
          )}

          {/* Import Statistics */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Statistics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <IconTrendingUp size={20} color="green" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Total Processed"
                        secondary={job.progress.processed.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <IconCheck size={20} color="green" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Successfully Imported"
                        secondary={job.progress.imported.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <IconRefresh size={20} color="blue" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Updated Existing"
                        secondary={job.progress.updated.toLocaleString()}
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <IconClock size={20} color="orange" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Duration"
                        secondary={formatDuration(job.createdAt, job.completedAt)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <IconInfoCircle size={20} color="gray" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Skipped"
                        secondary={job.progress.skipped.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <IconX size={20} color="red" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Failed"
                        secondary={job.progress.failed.toLocaleString()}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Errors Section */}
          {job.errors && job.errors.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<IconChevronDown />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconAlertTriangle size={20} color="orange" />
                  <Typography variant="h6">
                    Import Errors ({job.errors.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} elevation={0}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Level</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Product ID</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {job.errors.slice(0, 10).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip
                              label={error.level}
                              size="small"
                              color={error.level === 'error' ? 'error' : 'warning'}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap>
                              {error.message}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {error.productId || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => handleErrorClick(error)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {job.errors.length > 10 && (
                  <Box mt={2} textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      Showing 10 of {job.errors.length} errors
                    </Typography>
                    <Button size="small" onClick={() => setShowErrorDetails(true)}>
                      View All Errors
                    </Button>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Actions for completed imports */}
          {showResults && job.status === 'completed' && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  What's Next?
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    startIcon={<IconExternalLink />}
                    onClick={() => window.open('/apps/ecommerce/list', '_blank')}
                  >
                    View Products
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<IconDownload />}
                    onClick={() => {
                      // Export import log functionality could be added here
                      console.log('Export import log');
                    }}
                  >
                    Export Log
                  </Button>
                  {connection && (
                    <Button
                      variant="outlined"
                      startIcon={<IconExternalLink />}
                      onClick={() => window.open(connection.siteUrl, '_blank')}
                    >
                      View Source Store
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Error Detail Dialog */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Error Details</DialogTitle>
        <DialogContent>
          {selectedError && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Level
                  </Typography>
                  <Chip
                    label={selectedError.level}
                    color={selectedError.level === 'error' ? 'error' : 'warning'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Product ID
                  </Typography>
                  <Typography>{selectedError.productId || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Error Message
                  </Typography>
                  <Typography>{selectedError.message}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WordPressProgressTracker;