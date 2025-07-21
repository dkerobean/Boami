'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  TablePagination,
  CircularProgress,
  LinearProgress,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import {
  IconSearch,
  IconDownload,
  IconEye,
  IconTrash,
  IconDots,
  IconFile,
  IconFileText,
  IconTable,
  IconRefresh,
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';

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

interface ExportHistoryTableProps {
  exportHistory: ExportJob[];
  loading: boolean;
  onDownload: (job: ExportJob) => void;
  downloadingJobs?: Set<string>;
  onRetry?: (job: ExportJob) => void;
  onDelete?: (job: ExportJob) => void;
  onViewDetails?: (job: ExportJob) => void;
}

const ExportHistoryTable: React.FC<ExportHistoryTableProps> = ({
  exportHistory,
  loading,
  onDownload,
  downloadingJobs = new Set(),
  onRetry,
  onDelete,
  onViewDetails,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedJob, setSelectedJob] = useState<ExportJob | null>(null);

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <IconFileText size={20} color="green" />;
      case 'excel':
        return <IconTable size={20} color="blue" />;
      case 'json':
        return <IconFile size={20} color="purple" />;
      default:
        return <IconFile size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgress = (job: ExportJob) => {
    if (job.status === 'completed') return 100;
    if (job.status === 'failed') return 0;
    if (job.totalRecords === 0) return 0;
    return Math.round((job.exportedRecords / job.totalRecords) * 100);
  };

  const filteredJobs = exportHistory.filter((job) => {
    const matchesSearch = job.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesFormat = formatFilter === 'all' || job.format === formatFilter;
    
    return matchesSearch && matchesStatus && matchesFormat;
  });

  const paginatedJobs = filteredJobs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, job: ExportJob) => {
    setAnchorEl(event.currentTarget);
    setSelectedJob(job);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedJob(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedJob) return;
    
    switch (action) {
      case 'download':
        onDownload(selectedJob);
        break;
      case 'retry':
        onRetry?.(selectedJob);
        break;
      case 'delete':
        onDelete?.(selectedJob);
        break;
      case 'view':
        onViewDetails?.(selectedJob);
        break;
    }
    
    handleMenuClose();
  };

  const getFilterSummary = (job: ExportJob) => {
    const filters = [];
    if (job.filters.category) filters.push(`Category: ${job.filters.category}`);
    if (job.filters.status) filters.push(`Status: ${job.filters.status}`);
    if (job.filters.priceRange) {
      filters.push(`Price: $${job.filters.priceRange.min} - $${job.filters.priceRange.max}`);
    }
    if (job.filters.dateRange) {
      filters.push(`Date: ${job.filters.dateRange.start} - ${job.filters.dateRange.end}`);
    }
    
    return filters.length > 0 ? filters.join(', ') : 'No filters applied';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      {/* Search and Filters */}
      <Box p={2}>
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <TextField
            placeholder="Search by filename or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </TextField>
          
          <TextField
            select
            label="Format"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">All Formats</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="excel">Excel</MenuItem>
            <MenuItem value="json">JSON</MenuItem>
          </TextField>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Records</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Filters</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="h6" color="text.secondary">
                    No export jobs found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search or filter criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      {getFormatIcon(job.format)}
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          {job.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {job.format.toUpperCase()}
                          {job.fileSize && ` • ${formatFileSize(job.fileSize)}`}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      color={getStatusColor(job.status) as any}
                      size="small"
                    />
                    {job.error && (
                      <Typography variant="caption" color="error" display="block" mt={0.5}>
                        {job.error}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600">
                      {job.exportedRecords.toLocaleString()} / {job.totalRecords.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      records
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box width="100%" maxWidth={100}>
                      <LinearProgress
                        variant="determinate"
                        value={getProgress(job)}
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {getProgress(job)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {getFilterSummary(job)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </Typography>
                    {job.completedAt && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Completed {formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      {job.status === 'completed' && job.downloadUrl && (
                        <Tooltip title={downloadingJobs.has(job.id) ? "Downloading..." : "Download"}>
                          <span>
                            <IconButton 
                              size="small" 
                              onClick={() => onDownload(job)}
                              disabled={downloadingJobs.has(job.id)}
                            >
                              {downloadingJobs.has(job.id) ? (
                                <CircularProgress size={18} />
                              ) : (
                                <IconDownload size={18} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      
                      {onViewDetails && (
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => onViewDetails(job)}>
                            <IconEye size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title="More Actions">
                        <IconButton size="small" onClick={(e) => handleMenuClick(e, job)}>
                          <IconDots size={18} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredJobs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            minWidth: 180,
          },
        }}
      >
        {selectedJob?.status === 'completed' && selectedJob.downloadUrl && (
          <MenuItem onClick={() => handleMenuAction('download')}>
            <IconDownload size={18} style={{ marginRight: 8 }} />
            Download
          </MenuItem>
        )}
        
        {selectedJob?.status === 'failed' && onRetry && (
          <MenuItem onClick={() => handleMenuAction('retry')}>
            <IconRefresh size={18} style={{ marginRight: 8 }} />
            Retry Export
          </MenuItem>
        )}
        
        {onViewDetails && (
          <MenuItem onClick={() => handleMenuAction('view')}>
            <IconEye size={18} style={{ marginRight: 8 }} />
            View Details
          </MenuItem>
        )}
        
        {onDelete && (
          <MenuItem onClick={() => handleMenuAction('delete')}>
            <IconTrash size={18} style={{ marginRight: 8 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default ExportHistoryTable;