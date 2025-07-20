import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconTag,
  IconCash,
  IconReceipt
} from '@tabler/icons-react';

import DashboardCard from '@/app/components/shared/DashboardCard';
import CategoryForm from './CategoryForm';

// Define category data type
interface CategoryData {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  type: 'income' | 'expense';
  usageCount?: number;
  createdAt: string;
}

// Mock API functions - replace with actual API calls
const fetchCategories = async (type: 'income' | 'expense') => {
  // This would be replaced with an actual API call
  const mockData = {
    income: [
      {
        _id: '1',
        name: 'Product Sales',
        description: 'Revenue from product sales',
        isDefault: true,
        type: 'income' as const,
        usageCount: 15,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        _id: '2',
        name: 'Service Fees',
        description: 'Income from services provided',
        isDefault: true,
        type: 'income' as const,
        usageCount: 8,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        _id: '3',
        name: 'Consulting',
        description: 'Consulting and advisory services',
        isDefault: false,
        type: 'income' as const,
        usageCount: 3,
        createdAt: '2023-06-15T00:00:00.000Z'
      },
    ],
    expense: [
      {
        _id: '4',
        name: 'Office Supplies',
        description: 'Office equipment and supplies',
        isDefault: true,
        type: 'expense' as const,
        usageCount: 12,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        _id: '5',
        name: 'Travel',
        description: 'Business travel expenses',
        isDefault: true,
        type: 'expense' as const,
        usageCount: 6,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        _id: '6',
        name: 'Marketing',
        description: 'Marketing and advertising costs',
        isDefault: false,
        type: 'expense' as const,
        usageCount: 4,
        createdAt: '2023-05-20T00:00:00.000Z'
      },
      {
        _id: '7',
        name: 'Rent',
        description: 'Office rent and utilities',
        isDefault: true,
        type: 'expense' as const,
        usageCount: 12,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
    ]
  };

  return {
    categories: mockData[type],
    summary: {
      total: mockData[type].length,
      default: mockData[type].filter(c => c.isDefault).length,
      custom: mockData[type].filter(c => !c.isDefault).length
    }
  };
};

const deleteCategory = async (id: string, type: 'income' | 'expense') => {
  console.log(`Deleting ${type} category with ID: ${id}`);
  return { success: true };
};

const CategoryManagement = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');

  // State for categories data
  const [incomeCategories, setIncomeCategories] = useState<CategoryData[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for filtering
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for category form dialog
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryData | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryData | null>(null);

  // State for summary data
  const [summary, setSummary] = useState<{
    income: { total: number; default: number; custom: number };
    expense: { total: number; default: number; custom: number };
  }>({
    income: { total: 0, default: 0, custom: 0 },
    expense: { total: 0, default: 0, custom: 0 }
  });

  // Load categories data
  const loadCategoriesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [incomeResponse, expenseResponse] = await Promise.all([
        fetchCategories('income'),
        fetchCategories('expense')
      ]);

      setIncomeCategories(incomeResponse.categories);
      setExpenseCategories(expenseResponse.categories);
      setSummary({
        income: incomeResponse.summary,
        expense: expenseResponse.summary
      });

    } catch (err) {
      setError('Failed to load categories data. Please try again.');
      console.error('Error loading categories data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on initial render
  useEffect(() => {
    loadCategoriesData();
  }, []);

  // Get current categories based on active tab
  const getCurrentCategories = () => {
    const categories = activeTab === 'income' ? incomeCategories : expenseCategories;

    if (!searchTerm) return categories;

    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: 'income' | 'expense') => {
    setActiveTab(newValue);
    setSearchTerm(''); // Clear search when switching tabs
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Handle add new category
  const handleAddCategory = () => {
    setCurrentCategory(null);
    setOpenForm(true);
  };

  // Handle edit category
  const handleEditCategory = (category: CategoryData) => {
    setCurrentCategory(category);
    setOpenForm(true);
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const result = await deleteCategory(categoryToDelete._id, categoryToDelete.type);

      if (result.success) {
        // Remove the deleted category from the appropriate list
        if (categoryToDelete.type === 'income') {
          setIncomeCategories(incomeCategories.filter(cat => cat._id !== categoryToDelete._id));
        } else {
          setExpenseCategories(expenseCategories.filter(cat => cat._id !== categoryToDelete._id));
        }

        setDeleteDialogOpen(false);
        setCategoryToDelete(null);

        // Update summary
        setSummary(prev => ({
          ...prev,
          [categoryToDelete.type]: {
            total: prev[categoryToDelete.type].total - 1,
            default: categoryToDelete.isDefault
              ? prev[categoryToDelete.type].default - 1
              : prev[categoryToDelete.type].default,
            custom: !categoryToDelete.isDefault
              ? prev[categoryToDelete.type].custom - 1
              : prev[categoryToDelete.type].custom
          }
        }));
      } else {
        setError('Failed to delete category. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while deleting the category.');
      console.error('Error deleting category:', err);
    }
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setOpenForm(false);
    setCurrentCategory(null);
    loadCategoriesData(); // Reload data after form submission
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const currentCategories = getCurrentCategories();

  return (
    <>
      {/* Summary Cards */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconCash size={32} color="green" />
                <Box>
                  <Typography variant="h6" color="success.main">
                    Income Categories
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {summary.income.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.income.default} default, {summary.income.custom} custom
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconReceipt size={32} color="red" />
                <Box>
                  <Typography variant="h6" color="error.main">
                    Expense Categories
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {summary.expense.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.expense.default} default, {summary.expense.custom} custom
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <DashboardCard title="Category Management">
        <Box>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab
              label="Income Categories"
              value="income"
              icon={<IconCash size={20} />}
              iconPosition="start"
            />
            <Tab
              label="Expense Categories"
              value="expense"
              icon={<IconReceipt size={20} />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Toolbar */}
        <Box sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <TextField
              variant="outlined"
              size="small"
              placeholder={`Search ${activeTab} categories...`}
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
                <IconButton onClick={loadCategoriesData} disabled={loading}>
                  <IconRefresh size={20} />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<IconPlus size={20} />}
                onClick={handleAddCategory}
              >
                Add {activeTab === 'income' ? 'Income' : 'Expense'} Category
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
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Category Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Usage</TableCell>
                <TableCell align="center">Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : currentCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm ? 'No categories found matching your search' : `No ${activeTab} categories found`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                currentCategories.map((category) => (
                  <TableRow key={category._id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconTag size={16} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {category.name}
                        </Typography>
                        {category.isDefault && (
                          <Chip
                            label="Default"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {category.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={category.type === 'income' ? 'Income' : 'Expense'}
                        size="small"
                        color={category.type === 'income' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {category.usageCount || 0} times
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(category.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category)}
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={category.isDefault ? "Cannot delete default category" : "Delete"}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={category.isDefault}
                              onClick={() => {
                                setCategoryToDelete(category);
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
        </Box>
      </DashboardCard>

      {/* Category Form Dialog */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentCategory ? 'Edit Category' : `Add New ${activeTab === 'income' ? 'Income' : 'Expense'} Category`}
        </DialogTitle>
        <DialogContent>
          <CategoryForm
            category={currentCategory}
            type={activeTab}
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
            Are you sure you want to delete the category "{categoryToDelete?.name}"?
            {categoryToDelete?.usageCount && categoryToDelete.usageCount > 0 && (
              <> This category is currently used in {categoryToDelete.usageCount} records.</>
            )}
            {' '}This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteCategory} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CategoryManagement;