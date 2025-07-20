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
  Checkbox,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  TablePagination,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  IconSearch,
  IconEye,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconPackage,
  IconTruck,
  IconTrendingUp,
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';

interface StockAlert {
  id: string;
  productName: string;
  sku: string;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock' | 'high_demand';
  priority: 'critical' | 'high' | 'medium' | 'low';
  currentStock: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  lastUpdated: string;
}

interface StockAlertsTableProps {
  alerts: StockAlert[];
  loading: boolean;
  selectedAlerts: string[];
  onSelectionChange: (selected: string[]) => void;
}

const StockAlertsTable: React.FC<StockAlertsTableProps> = ({
  alerts,
  loading,
  selectedAlerts,
  onSelectionChange,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('all');

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <IconAlertCircle size={20} color="orange" />;
      case 'out_of_stock':
        return <IconPackage size={20} color="red" />;
      case 'overstock':
        return <IconTruck size={20} color="blue" />;
      case 'high_demand':
        return <IconTrendingUp size={20} color="green" />;
      default:
        return <IconAlertCircle size={20} />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'overstock':
        return 'Overstock';
      case 'high_demand':
        return 'High Demand';
      default:
        return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'acknowledged':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = alert.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || alert.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesAlertType = alertTypeFilter === 'all' || alert.alertType === alertTypeFilter;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesAlertType;
  });

  const paginatedAlerts = filteredAlerts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange(paginatedAlerts.map(alert => alert.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectAlert = (alertId: string) => {
    if (selectedAlerts.includes(alertId)) {
      onSelectionChange(selectedAlerts.filter(id => id !== alertId));
    } else {
      onSelectionChange([...selectedAlerts, alertId]);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAction = (alertId: string, action: 'acknowledge' | 'resolve' | 'view') => {
    console.log(`Action: ${action} on alert: ${alertId}`);
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
            placeholder="Search by product name or SKU..."
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
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="acknowledged">Acknowledged</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Alert Type</InputLabel>
            <Select
              value={alertTypeFilter}
              label="Alert Type"
              onChange={(e) => setAlertTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="low_stock">Low Stock</MenuItem>
              <MenuItem value="out_of_stock">Out of Stock</MenuItem>
              <MenuItem value="overstock">Overstock</MenuItem>
              <MenuItem value="high_demand">High Demand</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedAlerts.length > 0 && selectedAlerts.length < paginatedAlerts.length}
                  checked={paginatedAlerts.length > 0 && selectedAlerts.length === paginatedAlerts.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Alert Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Stock Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAlerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="h6" color="text.secondary">
                    No stock alerts found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search or filter criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAlerts.map((alert) => (
                <TableRow key={alert.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedAlerts.includes(alert.id)}
                      onChange={() => handleSelectAlert(alert.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        {alert.productName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        SKU: {alert.sku}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getAlertTypeIcon(alert.alertType)}
                      <Typography variant="body2">
                        {getAlertTypeLabel(alert.alertType)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                      color={getPriorityColor(alert.priority) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="600">
                        {alert.currentStock} / {alert.threshold}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Current / Threshold
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      color={getStatusColor(alert.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleAction(alert.id, 'view')}>
                          <IconEye size={18} />
                        </IconButton>
                      </Tooltip>
                      {alert.status === 'active' && (
                        <Tooltip title="Acknowledge">
                          <IconButton size="small" onClick={() => handleAction(alert.id, 'acknowledge')}>
                            <IconCheck size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {alert.status !== 'resolved' && (
                        <Tooltip title="Resolve">
                          <IconButton size="small" onClick={() => handleAction(alert.id, 'resolve')}>
                            <IconX size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
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
        count={filteredAlerts.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default StockAlertsTable;