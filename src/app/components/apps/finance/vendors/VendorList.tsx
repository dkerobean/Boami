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
  Avatar,
  Link
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconBuilding,
  IconMail,
  IconPhone,
  IconWorld,
  IconUser
} from '@tabler/icons-react';

import DashboardCard from '@/app/components/shared/DashboardCard';
import VendorForm from './VendorForm';

// Define vendor data type
interface VendorData {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
  expenseCount?: number;
  totalExpenses?: number;
  createdAt: string;
}

// Define column data type
interface HeadCell {
  id: keyof VendorData | 'actions';
  label: string;
  numeric: boolean;
  sortable: boolean;
}

// Define column headers
const headCells: HeadCell[] = [
  { id: 'name', label: 'Vendor Name', numeric: false, sortable: true },
  { id: 'contactPerson', label: 'Contact', numeric: false, sortable: true },
  { id: 'email', label: 'Email', numeric: false, sortable: false },
  { id: 'phone', label: 'Phone', numeric: false, sortable: false },
  { id: 'expenseCount', label: 'Expenses', numeric: true, sortable: true },
  { id: 'totalExpenses', label: 'Total Amount', numeric: true, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

// Mock API function - replace with actual API call
const fetchVendorData = async (page: number, limit: number, filters?: any) => {
  // This would be replaced with an actual API call
  return {
    vendors: [
      {
        _id: '1',
        name: 'Office Depot',
        email: 'orders@officedepot.com',
        phone: '+1-555-0123',
        address: '123 Business St, City, State 12345',
        website: 'https://www.officedepot.com',
        contactPerson: 'John Smith',
        notes: 'Preferred supplier for office supplies',
        expenseCount: 15,
        totalExpenses: 2450.75,
        createdAt: '2023-01-15T00:00:00.000Z'
      },
      {
        _id: '2',
        name: 'Property Management Co',
        email: 'rent@propmanage.com',
        phone: '+1-555-0456',
        address: '456 Real Estate Ave, City, State 12345',
        contactPerson: 'Sarah Johnson',
        notes: 'Monthly rent payments',
        expenseCount: 12,
        totalExpenses: 14400.00,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        _id: '3',
        name: 'Tech Solutions Inc',
        email: 'support@techsolutions.com',
        phone: '+1-555-0789',
        website: 'https://www.techsolutions.com',
        contactPerson: 'Mike Davis',
        notes: 'IT services and software licenses',
        expenseCount: 8,
        ts: 3200.50,
        createdAt: '2023-02-10T00:00:00.000Z'
      },
    ],
    pagination: {
      page,
      limit,
      total: 3,
      pages: 1
    },
    summary: {
      totalVendors: 3,
      totalExpenses: 20051.25,
      averageExpensePerVendor: 6683.75
    }
  };
};

// Mock delete function - replace with actual API call
const deleteVendor = async (id: string) => {
  console.log(`Deleting vendor with ID: ${id}`);
  return { success: true };
};

const VendorList = () => {
  // State for vendor data
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // State for sorting
  const [orderBy, setOrderBy] = useState<keyof VendorData>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // State for filtering
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for vendor form dialog
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [currentVendor, setCurrentVendor] = useState<VendorData | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [vendorToDelete, setVendorToDelete] = useState<VendorData | null>(null);

  // State for summary data
  const [summary, setSummary] = useState<{
    totalVendors: number;
    totalExpenses: number;
    averageExpensePerVendor: number;
  }>({
    totalVendors: 0,
    totalExpenses: 0,
    averageExpensePerVendor: 0
  });

  // Load vendor data
  const loadVendorData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: searchTerm,
        orderBy,
        order
      };

      const response = await fetchVendorData(page + 1, rowsPerPage, filters);

      setVendors(response.vendors);
      setTotalItems(response.pagination.total);
      setSummary(response.summary);

    } catch (err) {
      setError('Failed to load vendor data. Please try again.');
      console.error('Error loading vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on initial render and when dependencies change
  useEffect(() => {
    loadVendorData();
  }, [page, rowsPerPage, orderBy, order, searchTerm]);

  // Handle sort request
  const handleRequestSort = (property: keyof VendorData) => {
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

  // Handle add new vendor
  const handleAddVendor = () => {
    setCurrentVendor(null);
    setOpenForm(true);
  };

  // Handle edit vendor
  const handleEditVendor = (vendor: VendorData) => {
    setCurrentVendor(vendor);
    setOpenForm(true);
  };

  // Handle delete vendor
  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;

    try {
      const result = await deleteVendor(vendorToDelete._id);

      if (result.success) {
        // Remove the deleted vendor from the list
        setVendors(vendors.filter(vendor => vendor._id !== vendorToDelete._id));
        setDeleteDialogOpen(false);
        setVendorToDelete(null);

        // Update summary
        setSummary(prev => ({
          totalVendors: prev.totalVendors - 1,
          totalExpenses: prev.totalExpenses - (vendorToDelete.totalExpenses || 0),
          averageExpensePerVendor: prev.totalVendors > 1
            ? (prev.totalExpenses - (vendorToDelete.totalExpenses || 0)) / (prev.totalVendors - 1)
            : 0
        }));
      } else {
        setError('Failed to delete vendor. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while deleting the vendor.');
      console.error('Error deleting vendor:', err);
    }
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setOpenForm(false);
    setCurrentVendor(null);
    loadVendorData(); // Reload data after form submission
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

  // Get vendor initials for avatar
  const getVendorInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
                  <IconBuilding size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="primary">
                    Total Vendors
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {summary.totalVendors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active suppliers
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <IconMail size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="success.main">
                    Total Expenses
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatCurrency(summary.totalExpenses)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average: {formatCurrency(summary.averageExpensePerVendor)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <DashboardCard title="Vendor Directory">
        <Box>
          {/* Toolbar */}
          <Box sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search vendors..."
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

            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={loadVendorData} disabled={loading}>
                  <IconRefresh size={20} />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<IconPlus size={20} />}
                onClick={handleAddVendor}
              >
                Add Vendor
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
                        onClick={() => handleRequestSort(headCell.id as keyof VendorData)}
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
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No vendors found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor._id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          {getVendorInitials(vendor.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {vendor.name}
                          </Typography>
                          {vendor.website && (
                            <Link
                              href={vendor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="caption"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                              <IconWorld size={12} />
                              Website
                            </Link>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {vendor.contactPerson ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconUser size={16} />
                          <Typography variant="body2">
                            {vendor.contactPerson}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No contact person
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.email ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconMail size={16} />
                          <Link href={`mailto:${vendor.email}`} variant="body2">
                            {vendor.email}
                          </Link>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No email
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.phone ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconPhone size={16} />
                          <Link href={`tel:${vendor.phone}`} variant="body2">
                            {vendor.phone}
                          </Link>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No phone
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {vendor.expenseCount || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                        {formatCurrency(vendor.totalExpenses || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditVendor(vendor)}
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={vendor.expenseCount && vendor.expenseCount > 0 ? "Cannot delete vendor with expenses" : "Delete"}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!!(vendor.expenseCount && vendor.expenseCount > 0)}
                              onClick={() => {
                                setVendorToDelete(vendor);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <IconTrash size={18} />
                            </IconButton>
                          </span>
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

      {/* Vendor Form Dialog */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentVendor ? 'Edit Vendor' : 'Add New Vendor'}
        </DialogTitle>
        <DialogContent>
          <VendorForm
            vendor={currentVendor}
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
            Are you sure you want to delete the vendor "{vendorToDelete?.name}"?
            {vendorToDelete?.expenseCount && vendorToDelete.expenseCount > 0 && (
              <> This vendor has {vendorToDelete.expenseCount} associated expense records.</>
            )}
            {' '}This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteVendor} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VendorList;