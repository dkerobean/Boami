'use client';

import { useState, useEffect } from 'react';
import { 
  Grid, 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Stepper,
  Step,
  StepLabel,
  Alert,
  Snackbar,
  Chip,
  LinearProgress
} from '@mui/material';
import { 
  IconPlug, 
  IconSettings, 
  IconDownload, 
  IconCheck,
  IconArrowLeft,
  IconArrowRight
} from '@tabler/icons-react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/app/components/shared/BlankCard';
import WordPressConnectionManager from '@/app/components/apps/ecommerce/wordpressImport/WordPressConnectionManager';
import ImportConfiguration from '@/app/components/apps/ecommerce/wordpressImport/ImportConfiguration';
import WordPressProgressTracker from '@/app/components/apps/ecommerce/wordpressImport/WordPressProgressTracker';

const BCrumb = [
  {
    to: '/dashboards/ecommerce',
    title: 'Dashboard',
  },
  {
    to: '/apps/ecommerce/shop',
    title: 'Shop Management',
  },
  {
    title: 'Import from WooCommerce',
  },
];

interface Connection {
  _id: string;
  name: string;
  siteUrl: string;
  isActive: boolean;
  testResult?: {
    success: boolean;
    message: string;
    testedAt: Date;
  };
  importStats: {
    totalProducts: number;
    lastImportDate?: Date;
    totalSynced: number;
    totalErrors: number;
  };
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

const steps = [
  'Select Connection',
  'Configure Import',
  'Import Progress',
  'Results'
];

const WooCommerceImportPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [importConfig, setImportConfig] = useState<any>(null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch WordPress connections on component mount
  useEffect(() => {
    fetchConnections();
  }, []);

  // Poll job status when import is running
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
      pollInterval = setInterval(async () => {
        await fetchJobStatus();
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentJob?.jobId, currentJob?.status]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wordpress/connections');
      const result = await response.json();
      
      if (result.success) {
        setConnections(result.data?.connections || []);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch connections');
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobStatus = async () => {
    if (!currentJob?.jobId) return;

    try {
      const response = await fetch(`/api/products/wordpress/import?jobId=${currentJob.jobId}`);
      const result = await response.json();
      
      if (result.success) {
        setCurrentJob(result.data);
        
        if (result.data.status === 'completed') {
          setSuccess('Import completed successfully!');
          setActiveStep(3); // Move to results step
        } else if (result.data.status === 'failed') {
          setError('Import failed. Check the error details below.');
          setActiveStep(3);
        }
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    }
  };

  const handleConnectionSelect = (connection: Connection) => {
    setSelectedConnection(connection);
    setError(null);
  };

  const handleConfigurationComplete = (config: any) => {
    setImportConfig(config);
    setError(null);
  };

  const startImport = async () => {
    if (!selectedConnection || !importConfig) {
      setError('Please complete all steps before starting import');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/products/wordpress/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: selectedConnection._id,
          ...importConfig
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentJob({
          jobId: result.data.jobId,
          status: result.data.status,
          progress: result.data.progress || {
            total: 0,
            processed: 0,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            currentStep: 'Initializing...'
          },
          createdAt: new Date()
        });
        setActiveStep(2); // Move to progress step
        setSuccess('Import started successfully!');
      } else {
        setError(result.error || 'Failed to start import');
      }
    } catch (error) {
      console.error('Error starting import:', error);
      setError('Failed to start import. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedConnection) {
      setError('Please select a connection first');
      return;
    }
    
    if (activeStep === 1 && !importConfig) {
      setError('Please configure import settings first');
      return;
    }

    if (activeStep === 1) {
      // Start import when moving from configuration to progress
      startImport();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
    
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError(null);
  };

  const resetImport = () => {
    setActiveStep(0);
    setSelectedConnection(null);
    setImportConfig(null);
    setCurrentJob(null);
    setError(null);
    setSuccess(null);
    fetchConnections();
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <WordPressConnectionManager
            connections={connections}
            selectedConnection={selectedConnection}
            onConnectionSelect={handleConnectionSelect}
            onConnectionUpdate={fetchConnections}
            loading={loading}
          />
        );
      case 1:
        return (
          <ImportConfiguration
            connection={selectedConnection}
            onConfigurationChange={handleConfigurationComplete}
            initialConfig={importConfig}
          />
        );
      case 2:
      case 3:
        return (
          <WordPressProgressTracker
            job={currentJob}
            connection={selectedConnection}
            showResults={activeStep === 3}
          />
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <PageContainer title="WooCommerce Import" description="Import products from WooCommerce stores">
      <Breadcrumb title="Import from WooCommerce" items={BCrumb} />
      
      {/* Import Statistics Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {Array.isArray(connections) ? connections.filter(c => c.isActive).length : 0}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Connections
                  </Typography>
                </Box>
                <IconPlug size={48} color="blue" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {Array.isArray(connections) ? connections.reduce((sum, c) => sum + c.importStats.totalProducts, 0).toLocaleString() : '0'}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Imported
                  </Typography>
                </Box>
                <IconDownload size={48} color="green" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {Array.isArray(connections) ? connections.reduce((sum, c) => sum + c.importStats.totalSynced, 0).toLocaleString() : '0'}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Synced
                  </Typography>
                </Box>
                <IconCheck size={48} color="cyan" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {Array.isArray(connections) ? connections.reduce((sum, c) => sum + c.importStats.totalErrors, 0) : 0}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Errors
                  </Typography>
                </Box>
                <IconSettings size={48} color="orange" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Import Wizard */}
      <BlankCard>
        <CardContent sx={{ p: 4 }}>
          {/* Step Navigation */}
          <Box mb={4}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: '0.875rem',
                        fontWeight: activeStep === index ? 600 : 400,
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Import Progress Indicator */}
          {currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing') && (
            <Box mb={3}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Import in progress: {currentJob.progress?.currentStep || 'Processing...'}
                </Typography>
              </Alert>
              <LinearProgress 
                variant="determinate" 
                value={
                  currentJob.progress?.total > 0 
                    ? Math.round((currentJob.progress.processed / currentJob.progress.total) * 100)
                    : 0
                }
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {currentJob.progress?.processed || 0} of {currentJob.progress?.total || 0} processed
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentJob.progress?.total > 0 
                    ? Math.round((currentJob.progress.processed / currentJob.progress.total) * 100)
                    : 0}%
                </Typography>
              </Box>
            </Box>
          )}

          {/* Step Content */}
          <Box minHeight="400px">
            {getStepContent()}
          </Box>

          {/* Navigation Buttons */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={4} pt={3} borderTop="1px solid" borderColor="divider">
            <Button
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
              startIcon={<IconArrowLeft size={18} />}
            >
              Back
            </Button>

            <Box display="flex" gap={2}>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={resetImport}
                  startIcon={<IconSettings size={18} />}
                >
                  Start New Import
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading || (currentJob && currentJob.status === 'processing')}
                  endIcon={<IconArrowRight size={18} />}
                >
                  {activeStep === 1 ? 'Start Import' : 'Next'}
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </BlankCard>

      {/* Status Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default WooCommerceImportPage;