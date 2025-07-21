'use client';

import { useState, useEffect } from 'react';
import { Grid, Box, Typography, Button, Card, CardContent, Chip, Alert, Snackbar } from '@mui/material';
import { IconDownload, IconFilter, IconHistory, IconFile } from '@tabler/icons-react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/app/components/shared/BlankCard';
import SimpleExportPanel, { ExportType } from '@/app/components/apps/ecommerce/bulkExport/SimpleExportPanel';
import ExportHistoryTable from '@/app/components/apps/ecommerce/bulkExport/ExportHistoryTable';

const BCrumb = [
  {
    to: '/dashboards/ecommerce',
    title: 'Dashboard',
  },
  {
    title: 'Bulk Export',
  },
];

interface ExportJob {
  id: string;
  fileName: string;
  format: 'csv' | 'excel' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  exportedRecords: number;
  filters: {
    category?: string;
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    priceRange?: {
      min: number;
      max: number;
    };
  };
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSize?: number;
  error?: string;
}

interface SimpleExportOptions {
  type: ExportType;
  format: 'csv' | 'excel' | 'json';
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  category?: string;
}


const BulkExportPage = () => {
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'history'>('export');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());

  const fetchExportHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bulk-export');
      const result = await response.json();
      
      if (result.success) {
        // Transform the API response to match our interface
        const transformedHistory = result.data.map((job: any) => ({
          id: job.id,
          fileName: job.fileName,
          format: job.format,
          status: job.status,
          totalRecords: job.totalRecords,
          exportedRecords: job.processedRecords,
          filters: job.filters || {},
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          downloadUrl: job.downloadUrl,
          fileSize: job.fileSize,
          error: job.error,
        }));
        setExportHistory(transformedHistory);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch export history');
      }
    } catch (error) {
      console.error('Failed to fetch export history:', error);
      setError('Failed to fetch export history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExportHistory();
  }, []);

  const handleExport = async (options: SimpleExportOptions) => {
    console.log('Starting export with options:', options);
    
    try {
      setLoading(true);
      
      // Create export job via API
      const response = await fetch('/api/bulk-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: options.type,
          format: options.format,
          dateRange: options.dateRange?.start && options.dateRange?.end ? {
            start: options.dateRange.start.toISOString(),
            end: options.dateRange.end.toISOString(),
          } : undefined,
          category: options.category,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Export job created successfully!');
        setError(null);
        
        // Switch to history tab to show progress
        setActiveTab('history');
        
        // Refresh the export history to show the new job
        await fetchExportHistory();
        
        // Poll for updates every 2 seconds for 30 seconds
        const pollInterval = setInterval(async () => {
          await fetchExportHistory();
        }, 2000);
        
        // Stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
        }, 30000);
      } else {
        setError(result.error || 'Failed to create export job');
        console.error('Export creation failed:', result.error);
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to create export job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (job: ExportJob) => {
    if (job.status !== 'completed' || !job.downloadUrl) {
      console.error('Job not ready for download');
      setError('Export is not ready for download yet.');
      return;
    }
    
    // Add to downloading set
    setDownloadingJobs(prev => new Set(prev).add(job.id));
    setError(null); // Clear any previous errors
    
    try {
      console.log(`Downloading ${job.fileName}...`);
      
      // Try multiple download methods for better browser compatibility
      const downloadMethods = [
        // Method 1: Use the direct download URL (static file serving)
        () => {
          const link = document.createElement('a');
          link.href = job.downloadUrl!;
          link.download = job.fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },
        
        // Method 2: Fetch and blob download
        async () => {
          const response = await fetch(job.downloadUrl!);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = job.fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        },
        
        // Method 3: API endpoint fallback
        async () => {
          const response = await fetch(`/api/bulk-export/download/${job.id}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = job.fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        }
      ];
      
      // Try methods in order until one succeeds
      for (let i = 0; i < downloadMethods.length; i++) {
        try {
          await downloadMethods[i]();
          console.log(`Download successful using method ${i + 1}`);
          setSuccess(`Successfully downloaded ${job.fileName}`);
          return;
        } catch (methodError) {
          console.warn(`Download method ${i + 1} failed:`, methodError);
          if (i === downloadMethods.length - 1) {
            throw methodError; // Re-throw the last error
          }
        }
      }
      
    } catch (error) {
      console.error('All download methods failed:', error);
      setError(`Failed to download ${job.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Remove from downloading set
      setDownloadingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const getExportStats = () => {
    const stats = {
      total: exportHistory.length,
      completed: exportHistory.filter(job => job.status === 'completed').length,
      processing: exportHistory.filter(job => job.status === 'processing').length,
      failed: exportHistory.filter(job => job.status === 'failed').length,
      pending: exportHistory.filter(job => job.status === 'pending').length,
    };
    return stats;
  };

  const stats = getExportStats();

  return (
    <PageContainer title="Bulk Export" description="Export products to CSV, Excel, or JSON files">
      <Breadcrumb title="Bulk Export" items={BCrumb} />
      
      {/* Export Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {stats.total}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Exports
                  </Typography>
                </Box>
                <IconFile size={48} color="blue" />
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
                    {stats.completed}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Completed
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
                  <Typography variant="h4" color="warning.main">
                    {stats.processing}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Processing
                  </Typography>
                </Box>
                <IconFilter size={48} color="orange" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="error.main">
                    {stats.failed}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
                <IconHistory size={48} color="red" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Box mb={3}>
        <Box display="flex" gap={2}>
          <Button
            variant={activeTab === 'export' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('export')}
            startIcon={<IconDownload />}
          >
            New Export
          </Button>
          <Button
            variant={activeTab === 'history' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('history')}
            startIcon={<IconHistory />}
          >
            Export History
          </Button>
        </Box>
      </Box>

      {/* Content */}
      {activeTab === 'export' ? (
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={3}>
              Export Data
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Choose what data to export and download in your preferred format.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Export Tips:</strong> Large exports may take several minutes to process. 
                You can continue using the application while exports are running in the background.
              </Typography>
            </Alert>
            
            <SimpleExportPanel onExport={handleExport} />
          </CardContent>
        </BlankCard>
      ) : (
        <BlankCard>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Typography variant="h5">Export History</Typography>
              <Box>
                <Chip 
                  label={`${stats.total} total exports`} 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
            </Box>
            
            <ExportHistoryTable
              exportHistory={exportHistory}
              loading={loading}
              onDownload={handleDownload}
              downloadingJobs={downloadingJobs}
            />
          </CardContent>
        </BlankCard>
      )}
      
      {/* Error/Success Snackbars */}
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

export default BulkExportPage;