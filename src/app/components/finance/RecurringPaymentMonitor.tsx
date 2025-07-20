'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  Timeline,
  Error,
  CheckCircle,
  Warning,
  Info,
  Schedule,
  TrendingUp
} from '@mui/icons-material';

interface CronJobStatus {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  runCount: number;
  errorCount: number;
}

interface SchedulerStats {
  isRunning: boolean;
  totalJobs: number;
  enabledJobs: number;
  activeJobs: number;
  totalRuns: number;
  totalErrors: number;
}

interface PaymentMetrics {
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  totalAmount: number;
  averageProcessingTime: number;
  lastProcessingTime: Date | null;
  errorRate: number;
  uptime: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'processing' | 'success' | 'error' | 'warning' | 'info';
  category: 'recurring-payment' | 'system' | 'scheduler' | 'notification';
  message: string;
  data?: any;
  userId?: string;
}

const RecurringPaymentMonitor: React.FC = () => {
  const [schedulerStats, setSchedulerStats] = useState<SchedulerStats | null>(null);
  const [paymentMetrics, setPaymentMetrics] = useState<PaymentMetrics | null>(null);
  const [jobs, setJobs] = useState<CronJobStatus[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [forceRunning, setForceRunning] = useState(false);

  // Settings state
  const [cronSchedule, setCronSchedule] = useState('0 0 * * *');
  const [enableScheduler, setEnableScheduler] = useState(true);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);

      // Fetch scheduler status
      const response = await fetch('/api/admin/cron', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const data = await response.json();

      if (data.success) {
        setSchedulerStats(data.data.scheduler.stats);
        setJobs(data.data.jobs);

        // Fetch payment metrics (this would be a separate endpoint)
        // For now, using mock data
        setPaymentMetrics({
          totalProcessed: 150,
          totalSuccessful: 145,
          totalFailed: 5,
          totalAmount: 45000,
          averageProcessingTime: 250,
          lastProcessingTime: new Date(),
          errorRate: 3.33,
          uptime: Date.now() - new Date().setHours(0, 0, 0, 0)
        });

        // Fetch recent logs (this would be a separate endpoint)
        setLogs([
          {
            id: '1',
            timestamp: new Date(),
            type: 'success',
            category: 'recurring-payment',
            message: 'Successfully processed 5 recurring payments',
            data: { processedCount: 5, totalAmount: 2500 }
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 3600000),
            type: 'info',
            category: 'scheduler',
            message: 'Cron scheduler started',
            data: { intervalMinutes: 60 }
          }
        ]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulerControl = async (action: string, jobId?: string, params?: any) => {
    try {
      const response = await fetch('/api/admin/cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          jobId,
          ...params
        })
      });

      if (!response.ok) {
        throw new Error('Failed to control scheduler');
      }

      const data = await response.json();

      if (data.success) {
        await fetchMonitoringData();
        setError(null);
      } else {
        throw new Error(data.error?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleForceRun = async () => {
    setForceRunning(true);
    try {
      await handleSchedulerControl('force-run', 'recurring-payments');
    } finally {
      setForceRunning(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await handleSchedulerControl('update-schedule', 'recurring-payments', {
        schedule: cronSchedule
      });

      await handleSchedulerControl('enable-job', 'recurring-payments', {
        enabled: enableScheduler
      });

      setSettingsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle />;
      case 'error': return <Error />;
      case 'warning': return <Warning />;
      case 'info': return <Info />;
      default: return <Info />;
    }
  };

  if (loading && !schedulerStats) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading monitoring data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Recurring Payment Monitor
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchMonitoringData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Jobs" />
        <Tab label="Logs" />
        <Tab label="Metrics" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Scheduler Status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Schedule sx={{ mr: 1 }} />
                  <Typography variant="h6">Scheduler Status</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip
                    label={schedulerStats?.isRunning ? 'Running' : 'Stopped'}
                    color={schedulerStats?.isRunning ? 'success' : 'error'}
                    sx={{ mr: 2 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={schedulerStats?.isRunning ? <Stop /> : <PlayArrow />}
                    onClick={() => handleSchedulerControl(schedulerStats?.isRunning ? 'stop' : 'start')}
                  >
                    {schedulerStats?.isRunning ? 'Stop' : 'Start'}
                  </Button>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Total Jobs: {schedulerStats?.totalJobs || 0} |
                  Active: {schedulerStats?.activeJobs || 0} |
                  Total Runs: {schedulerStats?.totalRuns || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Processing */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUp sx={{ mr: 1 }} />
                  <Typography variant="h6">Payment Processing</Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={handleForceRun}
                  disabled={forceRunning}
                  sx={{ mb: 2 }}
                >
                  {forceRunning ? 'Processing...' : 'Force Run Now'}
                </Button>

                {paymentMetrics && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Success Rate: {((paymentMetrics.totalSuccessful / paymentMetrics.totalProcessed) * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount: ${paymentMetrics.totalAmount.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Processing Time: {paymentMetrics.averageProcessingTime}ms
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Recent Activity</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.slice(0, 5).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.timestamp.toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              icon={getStatusIcon(log.type)}
                              label={log.type}
                              color={getStatusColor(log.type) as any}
                            />
                          </TableCell>
                          <TableCell>{log.message}</TableCell>
                          <TableCell>
                            {log.data && (
                              <Typography variant="caption" color="text.secondary">
                                {JSON.stringify(log.data, null, 2)}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Cron Jobs</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job Name</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Run</TableCell>
                    <TableCell>Next Run</TableCell>
                    <TableCell>Runs</TableCell>
                    <TableCell>Errors</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job, index) => (
                    <TableRow key={index}>
                      <TableCell>{job.name}</TableCell>
                      <TableCell>
                        <code>{job.schedule}</code>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={job.enabled ? 'Enabled' : 'Disabled'}
                          color={job.enabled ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {job.lastRun ? job.lastRun.toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        {job.nextRun ? job.nextRun.toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>{job.runCount}</TableCell>
                      <TableCell>
                        {job.errorCount > 0 && (
                          <Chip size="small" label={job.errorCount} color="error" />
                        )}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={job.enabled}
                              onChange={(e) => handleSchedulerControl('enable-job', 'recurring-payments', {
                                enabled: e.target.checked
                              })}
                            />
                          }
                          label=""
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>System Logs</Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="caption">
                          {log.timestamp.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={getStatusIcon(log.type)}
                          label={log.type}
                          color={getStatusColor(log.type) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={log.category} variant="outlined" />
                      </TableCell>
                      <TableCell>{log.message}</TableCell>
                      <TableCell>
                        {log.userId ? (
                          <Typography variant="caption">{log.userId}</Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">System</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && paymentMetrics && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {paymentMetrics.totalProcessed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Processed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {paymentMetrics.totalSuccessful}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successful
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main">
                  {paymentMetrics.totalFailed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  {paymentMetrics.errorRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Error Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Performance Metrics</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Average Processing Time: {paymentMetrics.averageProcessingTime}ms
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Total Amount Processed: ${paymentMetrics.totalAmount.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  System Uptime: {formatDuration(paymentMetrics.uptime)}
                </Typography>
                <Typography variant="body2">
                  Last Processing: {paymentMetrics.lastProcessingTime?.toLocaleString() || 'Never'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Scheduler Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={enableScheduler}
                  onChange={(e) => setEnableScheduler(e.target.checked)}
                />
              }
              label="Enable Automatic Processing"
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Cron Schedule"
              value={cronSchedule}
              onChange={(e) => setCronSchedule(e.target.value)}
              helperText="Cron expression for scheduling (e.g., '0 0 * * *' for daily at midnight)"
              sx={{ mb: 2 }}
            />

            <Alert severity="info">
              Common schedules:
              <br />• Daily: 0 0 * * *
              <br />• Every 6 hours: 0 */6 * * *
              <br />• Every hour: 0 * * * *
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecurringPaymentMonitor;