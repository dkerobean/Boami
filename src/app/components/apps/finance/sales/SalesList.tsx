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
  Select,
  Avatar
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
  IconCalendar,
  IconShoppingCart,
  IconTrendingUp
} from '@tabler/icons-react';

import DashboardCard from '@/app/components/shared/DashboardCard';
import BlankCard from '@/app/components/shared/BlankCard';
import SaleForm from './SaleForm';

// Define sale data type
interface SaleData {
  _id: string;
  productId: {
    _id: string;
    title: string;
    price: number;
    qty: number;
    sku?: string;
    image?: string;
  };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

// Define column data type
interface HeadCell {
  id: keyof SaleData | 'product' | 'actions';
  label: string;
  numeric: boolean;
  sortable: boolean;
}

// Define column headers
const headCells: HeadCell[] = [
  { id: 'date', label: 'Date', numeric: false, sortable: true },
  { id: 'product', label: 'Product', numeric: false, sortable: false },
  { id: 'quantity', label: 'Quantity', numeric: true, sortable: true },
  { id: 'unitPrice', label: 'Unit Price', numeric: true, sortable: true },
  { id: 'totalAmount', label: 'Total Amount', numeric: true, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

// Mock API function - replace with actual API call
const fetchSalesData = async (page: number, limit: number, filters?: any) => {
  // This would be replaced with an actual API call
  return {
    sales: [
      {
        _id: '1',
        productId: {
          _id: 'prod1',
          title: 'Wireless Bluetooth Headphones',
          price: 79.99,
          qty: 45,
          sku: 'WBH-001',
          image: '/images/products/s1.jpg'
        },
        quantity: 2,
        unitPrice: 79.99,
        totalAmount: 159.98,
        date: '2023-07-15T00:00:00.000Z',
        notes: 'Customer requested express shipping',
        createdAt: '2023-07-15T10:30:00.000Z'
      },
      {
        _id: '2',
        productId: {
          _id: 'prod2',
          title: 'Smart Fitness Watch',
          price: 199.99,
          qty: 23,
          sku: 'SFW-002'
        },
        quantity: 1,
        unitPrice: 199.99,
        totalAmount: 199.99,
        date: '2023-07-14T00:00:00.000Z',
        createdAt: '2023-07-14T14:20:00.000Z'
      },
      {
        _id: '3',
        productId: {
          _id: 'prod3',
          title: 'Portable Phone Charger',
          price: 29.99,
          qty: 78,
          sku: 'PPC-003'
        },
        quantity: 3,
        unitPrice: 29.99,
        totalAmount: 89.97,
        date: '2023-07-13T00:00:00.000Z',
        notes: 'Bulk purchase discount applied',
        createdAt: '2023-07-13T16:45:00.000Z'
      },
    ],
    pagination: {
      page,
      limit,
      total: 3,
      pages: 1
    },
    summary: {
      totalRevenue: 449.94,
      totalQuantity: 6,
      count: 3,
      averageSale: 149.98
    }
  };
};

// Mock delete function - replace with actual API call
const deleteSale = async (id: string) => {
  console.log(`Deleting sale with ID: ${id}`);
  return { success: true };
};

const SalesList = () => {
  // State for sales data
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // State for sorting
  const [orderBy, setOrderBy] = useState<keyof SaleData>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // State for filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');

  // State for sale form dialog
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [currentSale, setCurrentSale] = useState<SaleData | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  // State for summary data
  const [summary, setSummary] = useState<{
    totalRevenue: number;
    totalQuantity: number;
    count: number;
    averageSale: number;
  }>({
    totalRevenue: 0,
    totalQuantity: 0,
    count: 0,
    averageSale: 0
  });

  // Load sales data
  const loadSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: searchTerm,
        dateRange: dateRange,
        orderBy,
        order
      };

      const response = await fetchSalesData(page + 1, rowsPerPage, filters);

      setSales(response.sales);
      setTotalItems(response.pagination.total);
      setSummary(response.summary);

    } catch (err) {
      setError('Failed to load sales data. Please try again.');
      console.error('Error loading sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on initial render and when dependencies change
  useEffect(() => {
    loadSalesData();
  }, [page, rowsPerPage, orderBy, order, searchTerm, dateRange]);

  // Handle sort request
  const handleRequestSort = (property: keyof SaleData) => {
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
      case 'dateRange':
        setDateRange(value);
        break;
    }
    setPage(0); // Reset to first page when filtering
  };

  // Handle add new sale
  const handleAddSale = () => {
    setCurrentSale(null);
    setOpenForm(true);
  };

  // Handle edit sale
  const handleEditSale = (sale: SaleData) => {
    setCurrentSale(sale);
    setOpenForm(true);
  };

  // Handle delete sale
  const handleDeleteSale = async () => {
    if (!saleToDelete) return;

    try {
      const result = await deleteSale(saleToDelete);

      if (result.success) {
        // Remove the deleted sale from the list
        setSales(sales.filter(sale => sale._id !== saleToDelete));
        setDeleteDialogOpen(false);
        setSaleToDelete(null);

        // Update summary
        const deletedSale = sales.find(s => s._id === saleToDelete);
        if (deletedSale) {
          setSummary(prev => ({
            totalRevenue: prev.totalRevenue - deletedSale.totalAmount,
            totalQuantity: prev.totalQuantity - deletedSale.quantity,
            count: prev.count - 1,
            averageSale: prev.count > 1 ? (prev.totalRevenue - deletedSale.totalAmount) / (prev.count - 1) : 0
          }));
        }
      } else {
        setError('Failed to delete sale. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while deleting the sale.');
      console.error('Error deleting sale:', err);
    }
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setOpenForm(false);
    setCurrentSale(null);
    loadSalesData(); // Reload data after form submission
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
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <IconTrendingUp size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="primary">
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatCurrency(summary.totalRevenue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.count} sales
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <IconShoppingCart size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="success.main">
                    Units Sold
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {summary.totalQuantity}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average: {formatCurrency(summary.averageSale)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <DashboardCard title="Sales Records">
        <Box>
          {/* Toolbar */}
          <Box sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search sales..."
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
                <IconButton onClick={loadSalesData} disabled={loading}>
                  <IconRefresh size={20} />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<IconPlus size={20} />}
                onClick={handleAddSale}
              >
                Record Sale
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
                        onClick={() => handleRequestSort(headCell.id as keyof SaleData)}
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
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No sales found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale._id} hover>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        {sale.productId.image ? (
                          <Avatar
                            src={sale.productId.image}
                            alt={sale.productId.title}
                            sx={{ width: 40, height: 40 }}
                          />
                        ) : (
                          <Avatar sx={{ width: 40, height: 40, bgcolor: 'grey.300' }}>
                            {sale.productId.title.charAt(0)}
                          </Avatar>
                        )}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {sale.productId.title}
                          </Typography>
                          {sale.productId.sku && (
                            <Typography variant="caption" color="text.secondary">
                              SKU: {sale.productId.sku}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {sale.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(sale.unitPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {formatCurrency(sale.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditSale(sale)}
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSaleToDelete(sale._id);
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

      {/* Sale Form Dialog */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentSale ? 'Edit Sale' : 'Record New Sale'}
        </DialogTitle>
        <DialogContent>
          <SaleForm
            sale={currentSale}
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
            Are you sure you want to delete this sale? This action will also restore the inventory quantity and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSale} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SalesList;