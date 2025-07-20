import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  CircularProgress,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  Avatar
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconCalendar,
  IconClock,
  IconRepeat,
  IconCash,
  IconReceipt
} from '@tabler/icons-react';

import DashboardCard from '@/app/components/shared/DashboardCard';
import RecurringPaymentForm from './RecurringPaymentForm';

// Define recurring payment data type
interface RecurringPaymentData {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  categoryId: {
    _id: string;
    name: string;
  };
  vendorId?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  processedCount?: number;
  totalProcessed?: number;
  createdAt: string;
}

// Define column data type
interface HeadCell {
  id: keyof RecurringPaymentData | 'actions';
  label: string;
  numeric: boolean;
  sortable: boolean;
}

// Define column headers
const headCells: HeadCell[] = [
  { id: 'description', label: 'Description', numeric: false, sortable: true },
  { id: 'type', label: 'Type', numeric: false, sortable: true },
  { id: 'amount', label: 'Amount', numeric: true, sortable: true },
  { id: 'frequency', label: 'Frequency', numeric: false, sortable: true },
  { id: 'nextDueDate', label: 'Next Due', numeric: false, sortable: true },
  { id: 'isActive', label: 'Status', numeric: false, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

// Mock API function - replace with actual API call
const fetchRecurringPaymentsData = async (page: number, limit: number, filters?: any) => {
  // This would be replaced with an actual API call
  return {
    recurringPayments: [
      {
        _id: '1',
        type: 'expense' as const,
        amount: 1200.00,
        description: 'Monthly office rent',
        frequency: 'monthly' as const,
        startDate: '2023-01-01T00:00:00.000Z',
        nextDueDate: '2023-08-01T00:00:00.000Z',
        categoryId: {
          _id: 'cat1',
          name: 'Rent'
        },
        vendorId: {
          _id: 'vendor1',
          name: 'Property Management Co'
        },
        isActive: true,
        processedCount: 7,
        totalProcessed: 8400.00,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        _id: '2',
        type: 'income' as const,
        amount: 2500.00,
        description: 'Monthly subscription revenue',
        frequency: 'monthly' as const,
        startDate: '2023-02-01T00:00:00.000Z',
        nextDueDate: '2023-08-01T00:00:00.000Z',
        categoryId: {
          _id: 'cat2',
          name: 'Subscription Revenue'
        },
        isActive: true,
        processedCount: 6,
        totalProcessed: 15000.00,
        createdAt: '2023-02-01T00:00:00.000Z'
      },
      {
        _id: '3',
        type: 'expense' as const,
        amount: 99.99,
        description: 'Software license renewal',
        frequency: 'yearly' as const,
        startDate: '2023-01-15T00:00:00.000Z',
        endDate: '2025-01-15T00:00:00.000Z',
        nextDueDate: '2024-01-15T00:00:00.000Z',
        categoryId: {
          _id: 'cat3',
          name: 'Software & Tools'
        },
        isActive: false,
        processedCount: 1,
        totalProcessed: 99.99,
        createdAt: '2023-01-15T00:00:00.000Z'
      },
    ],
    pagination: {
      page,
      limit,
      total: 3,
      pages: 1
    },
    summary: {
      totalActive: 2,
      totalInactive: 1,
      monthlyIncome: 2500.00,
      monthlyExpenses: 1200.00,
      netMonthly: 1300.00
    }
  };
};

// Mock delete function - replace with actual API call
const deleteRecurringPayment = async (id: string) => {
  console.log(`Deleting recurring payment with ID: ${id}`);
  return { success: true };
};

// Mock toggle active function - replace with actual API call
const toggleRecurringPaymentStatus = async (id: string, isActive: boolean) => {
  console.log(`Toggling recurring payment ${id} to ${isActive ? 'active' : 'inactive'}`);
  return { success: true };
};

const RecurringPaymentList = () => {
  // State for recurring payments data
  const [recurringPayments, setRecurringPayments] = useState<RecurringPaymentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // State for sorting
  const [orderBy, setOrderBy] = useState<keyof RecurringPaymentData>('nextDueDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // State for filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // State for recurring payment form dialog
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [currentRecurringPayment, setCurrentRecurringPayment] = useState<RecurringPaymentData | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [recurringPaymentToDelete, setRecurringPaymentToDelete] = useState<RecurringPaymentData | null>(null);

  // State for summary data
  const [summary, setSummary] = useState<{
    totalActive: number;
    totalInactive: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    netMonthly: number;
  }>({
    totalActive: 0,
    totalInactive: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netMonthly: 0
  });

  // Load recurring payments data
  const loadRecurringPaymentsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: searchTerm,
        type: typeFilter,
        status: statusFilter,
        orderBy,
        order
      };

      const response = await fetchRecurringPaymentsData(page + 1, rowsPerPage, filters);

      setRecurringPayments(response.recurringPayments);
      setTotalItems(response.pagination.total);
      setSummary(response.summary);

    } catch (err) {
      setError('Failed to load recurring payments data. Please try again.');
      console.error('Error loading recurring payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on initial render and when dependencies change
  useEffect(() => {
    loadRecurringPaymentsData();
  }, [page, rowsPerPage, orderBy, order, searchTerm, typeFilter, statusFilter]);

  // Handle sort request
  const handleRequestSort = (property: keyof RecurringPaymentData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'type':
        setTypeFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
    }
    setPage(0); // Reset to first page when filtering
  };

  // Handle add new recurring payment
  const handleAddRecurringPayment = () => {
    setCurrentRecurringPayment(null);
    setOpenForm(true);
  };

  // Handle edit recurring payment
  const handleEditRecurringPayment = (recurringPayment: RecurringPaymentData) => {
    setCurrentRecurringPayment(recurringPayment);
    setOpenForm(true);
  };

  // Handle toggle status
  const handleToggleStatus = async (recurringPayment: RecurringPaymentData) => {
    try {
      const result = await toggleRecurringPaymentStatus(recurringPayment._id, !recurringPayment.isActive);

      if (result.success) {
        // Update the status in the list
        setRecurringPayments(recurringPayments.map(rp =>
          rp._id === recurringPayment._id
            ? { ...rp, isActive: !rp.isActive }
            : rp
        ));

        // Update summary
        setSummary(prev => ({
          ...prev,
          totalActive: recurringPayment.isActive ? prev.totalActive - 1 : prev.totalActive + 1,
          totalInactive: recurringPayment.isActive ? prev.totalInactive + 1 : prev.totalInactive - 1
        }));
      } else {
        setError('Failed to update recurring payment status. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while updating the status.');
      console.error('Error toggling status:', err);
    }
  };

  // Handle delete recurring payment
  const handleDeleteRecurringPayment = async () => {
    if (!recurringPaymentToDelete) return;

    try {
      const result = await deleteRecurringPayment(recurringPaymentToDelete._id);

      if (result.success) {
        // Remove the deleted recurring payment from the list
        setRecurringPayments(recurringPayments.filter(rp => rp._id !== recurringPaymentToDelete._id));
        setDeleteDialogOpen(false);
        setRecurringPaymentToDelete(null);

        // Update summary
        setSummary(prev => ({
          ...prev,
          totalActive: recurringPaymentToDelete.isActive ? prev.totalActive - 1 : prev.totalActive,
          totalInactive: !recurringPaymentToDelete.isActive ? prev.totalInactive - 1 : prev.totalInactive
        }));
      } else {
        setError('Failed to delete recurring payment. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while deleting the recurring payment.');
      console.error('Error deleting recurring payment:', err);
    }
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setOpenForm(false);
    setCurrentRecurringPayment(null);
    loadRecurringPaymentsData(); // Reload data after form submission
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get frequency label
  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  // Check if payment is overdue
  const isOverdue = (nextDueDate: string) => {
    return new Date(nextDueDate) < new Date();
  };

  return (
    <>
      {/* Summary Cards */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <IconRepeat size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="primary">
                    Active Payments
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {summary.totalActive}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.totalInactive} inactive
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <IconCash size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="success.main">
                    Monthly Income
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatCurrency(summary.monthlyIncome)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recurring income
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <IconReceipt size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="error.main">
                    Monthly Expenses
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatCurrency(summary.monthlyExpenses)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recurring expenses
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: summary.netMonthly >= 0 ? 'success.main' : 'error.main' }}>
                  <IconClock size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color={summary.netMonthly >= 0 ? 'success.main' : 'error.main'}>
                    Net Monthly
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatCurrency(summary.netMonthly)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Income - Expenses
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <DashboardCard title="Recurring Payments">
        <Box>
          {/* Toolbar */}
          <Box sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={handleSearch}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={20} />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={loadRecurringPaymentsData} disabled={loading}>
                  <IconRefresh size={20} />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<IconPlus size={20} />}
                onClick={handleAddRecurringPayment}
              >
                Add Payment
              </Button>
            </Stack>
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Data Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table sx={{ minWidth: 750 }}>
            <TableHead>
              <TableRow>
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    sortDirection={orderBy === headCell.id ? order : false}
                  >
                    {headCell.sortable ? (
                      <TableSortLabel
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={() => handleRequestSort(headCell.id as keyof RecurringPaymentData)}
                      >
                        {headCell.label}
                        {orderBy === headCell.id ? (
                          <Box component="span" sx={visuallyHidden}>
                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                          </Box>
                        ) : null}
                      </TableSortLabel>
                    ) : (
                      headCell.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : recurringPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No recurring payments found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recurringPayments.map((payment) => (
                  <TableRow key={payment._id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {payment.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {payment.categoryId.name}
                          {payment.vendorId && ` • ${payment.vendorId.name}`}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.type === 'income' ? 'Income' : 'Expense'}
                        size="small"
                        color={payment.type === 'income' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(payment.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getFrequencyLabel(payment.frequency)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          color={isOverdue(payment.nextDueDate) ? 'error.main' : 'text.primary'}
                          sx={{ fontWeight: isOverdue(payment.nextDueDate) ? 600 : 400 }}
                        >
                          {formatDate(payment.nextDueDate)}
                        </Typography>
                        {isOverdue(payment.nextDueDate) && (
                          <Typography variant="caption" color="error.main">
                            Overdue
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Switch
                          checked={payment.isActive}
                          onChange={() => handleToggleStatus(payment)}
                          size="small"
                        />
                        <Chip
                          label={payment.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={payment.isActive ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditRecurringPayment(payment)}
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setRecurringPaymentToDelete(payment);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <IconTrash size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
        </Box>
      </DashboardCard>

      {/* Recurring Payment Form Dialog */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentRecurringPayment ? 'Edit Recurring Payment' : 'Add New Recurring Payment'}
        </DialogTitle>
        <DialogContent>
          <RecurringPaymentForm
            recurringPayment={currentRecurringPayment}
            onSuccess={handleFormSubmit}
            onCancel={() => setOpenForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the recurring payment "{recurringPaymentToDelete?.description}"?
            {recurringPaymentToDelete?.processedCount && recurringPaymentToDelete.processedCount > 0 && (
              <> This payment has been processed {recurringPaymentToDelete.processedCount} times.</>
            )}
            {' '}This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteRecurringPayment} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RecurringPaymentList;