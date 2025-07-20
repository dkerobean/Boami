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
  Toolbar,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
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
  Select
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconFileExport,
  IconCalendar
} from '@tabler/icons-react';

import DashboardCard from '@/app/components/shared/DashboardCard';
import BlankCard from '@/app/components/shared/BlankCard';
import ExpenseForm from './ExpenseForm';

// Define expense data type
interface ExpenseData {
  _id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  category: {
    _id: string;
    name: string;
    isDefault: boolean;
  } | null;
  vendorId?: string;
  vendor?: {
    _id: string;
    name: string;
    email?: string;
  } | null;
  isRecurring: boolean;
  createdAt: string;
}

// Define column data type
interface HeadCell {
  id: keyof ExpenseData | 'actions';
  label: string;
  numeric: boolean;
  sortable: boolean;
}

// Define column headers
const headCells: HeadCell[] = [
  { id: 'date', label: 'Date', numeric: false, sortable: true },
  { id: 'description', label: 'Description', numeric: false, sortable: true },
  { id: 'category', label: 'Category', numeric: false, sortable: false },
  { id: 'vendor', label: 'Vendor', numeric: false, sortable: false },
  { id: 'amount', label: 'Amount', numeric: true, sortable: true },
  { id: 'isRecurring', label: 'Type', numeric: false, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

// API function to fetch expense data
const fetchExpenseData = async (page: number, limit: number, filters?: any) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.vendor && { vendor: filters.vendor }),
      ...(filters?.dateRange && { dateRange: filters.dateRange }),
      ...(filters?.orderBy && { orderBy: filters.orderBy }),
      ...(filters?.order && { order: filters.order }),
    });

    const response = await fetch(`/api/finance/expenses?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch expenses');
    }

    const data = await response.json();
    return {
      expenses: data.data?.expenses || [],
      pagination: data.data?.pagination || { page, limit, total: 0, pages: 0 },
      summary: data.data?.summary || { totalAmount: 0, count: 0 }
    };
  } catch (error) {
    console.error('Error fetching expense data:', error);
    return {
      expenses: [],
      pagination: { page, limit, total: 0, pages: 0 },
      summary: { totalAmount: 0, count: 0 }
    };
  }
};

// Real API function to delete expense
const deleteExpense = async (id: string) => {
  const response = await fetch(`/api/finance/expenses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete expense');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to delete expense');
  }
  
  return { success: true };
};

const ExpenseList = () => {
  // State for expense data
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // State for sorting
  const [orderBy, setOrderBy] = useState<keyof ExpenseData>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // State for filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');

  // State for expense form dialog
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [currentExpense, setCurrentExpense] = useState<ExpenseData | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // State for summary data
  const [summary, setSummary] = useState<{ totalAmount: number; count: number }>({
    totalAmount: 0,
    count: 0
  });

  // Load expense data
  const loadExpenseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: searchTerm,
        category: categoryFilter,
        vendor: vendorFilter,
        dateRange: dateRange,
        orderBy,
        order
      };

      const response = await fetchExpenseData(page + 1, rowsPerPage, filters);

      setExpenses(response.expenses);
      setTotalItems(response.pagination.total);
      setSummary(response.summary);

    } catch (err) {
      setError('Failed to load expense data. Please try again.');
      console.error('Error loading expense data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on initial render and when dependencies change
  useEffect(() => {
    loadExpenseData();
  }, [page, rowsPerPage, orderBy, order, searchTerm, categoryFilter, vendorFilter, dateRange]);

  // Handle sort request
  const handleRequestSort = (property: keyof ExpenseData) => {
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
      case 'category':
        setCategoryFilter(value);
        break;
      case 'vendor':
        setVendorFilter(value);
        break;
      case 'dateRange':
        setDateRange(value);
        break;
    }
    setPage(0); // Reset to first page when filtering
  };

  // Handle add new expense
  const handleAddExpense = () => {
    setCurrentExpense(null);
    setOpenForm(true);
  };

  // Handle edit expense
  const handleEditExpense = (expense: ExpenseData) => {
    setCurrentExpense(expense);
    setOpenForm(true);
  };

  // Handle delete expense
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;

    try {
      const result = await deleteExpense(expenseToDelete);

      if (result.success) {
        // Remove the deleted expense from the list
        setExpenses(expenses.filter(expense => expense._id !== expenseToDelete));
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);

        // Update summary
        const deletedExpense = expenses.find(e => e._id === expenseToDelete);
        if (deletedExpense) {
          setSummary(prev => ({
            totalAmount: prev.totalAmount - deletedExpense.amount,
            count: prev.count - 1
          }));
        }
      } else {
        setError('Failed to delete expense. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while deleting the expense.');
      console.error('Error deleting expense:', err);
    }
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setOpenForm(false);
    setCurrentExpense(null);
    loadExpenseData(); // Reload data after form submission
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

  return (
    <>
      {/* Summary Cards */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" color="primary">
                Total Expenses
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {formatCurrency(summary.totalAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.count} expense records
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <DashboardCard title="Expense Records">
        <Box>
          {/* Toolbar */}
          <Box sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search expenses..."
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
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  label="Date Range"
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="quarter">This Quarter</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={loadExpenseData} disabled={loading}>
                  <IconRefresh size={20} />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<IconPlus size={20} />}
                onClick={handleAddExpense}
              >
                Add Expense
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
                        onClick={() => handleRequestSort(headCell.id as keyof ExpenseData)}
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
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No expenses found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense._id} hover>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {expense.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {expense.category && (
                        <Chip
                          label={expense.category.name}
                          size="small"
                          variant={expense.category.isDefault ? "filled" : "outlined"}
                          color="primary"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.vendor ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {expense.vendor.name}
                          </Typography>
                          {expense.vendor.email && (
                            <Typography variant="caption" color="text.secondary">
                              {expense.vendor.email}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No vendor
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(expense.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={expense.isRecurring ? 'Recurring' : 'One-time'}
                        size="small"
                        color={expense.isRecurring ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setExpenseToDelete(expense._id);
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

      {/* Expense Form Dialog */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentExpense ? 'Edit Expense' : 'Add New Expense'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <ExpenseForm
            expense={currentExpense as any}
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
            Are you sure you want to delete this expense? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteExpense} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExpenseList;