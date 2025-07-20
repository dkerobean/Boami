'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconFilter,
  IconSearch,
  IconCurrencyDollar
} from '@tabler/icons-react';
import { format } from 'date-fns';
import IncomeForm from './IncomeForm';

interface Income {
  _id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: {
    _id: string;
    name: string;
    isDefault: boolean;
  };
  saleId?: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IncomeCategory {
  _id: string;
  name: string;
  isDefault: boolean;
}

const IncomeList: React.FC = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchIncomes();
    fetchCategories();
  }, []);

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/income', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch incomes');
      }
      const data = await response.json();
      setIncomes(data.data?.incomes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incomes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/finance/categories/income', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data.data?.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleCreateIncome = () => {
    setEditingIncome(null);
    setOpenForm(true);
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setOpenForm(true);
  };

  const handleDeleteIncome = (income: Income) => {
    setIncomeToDelete(income);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!incomeToDelete) return;

    try {
      const response = await fetch(`/api/finance/income/${incomeToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete income');
      }

      setIncomes(incomes.filter(income => income._id !== incomeToDelete._id));
      setDeleteConfirmOpen(false);
      setIncomeToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete income');
    }
  };

  const handleFormSuccess = () => {
    setOpenForm(false);
    setEditingIncome(null);
    fetchIncomes();
  };

  const filteredIncomes = incomes.filter(income => {
    const matchesSearch = income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         income.categoryId.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || income.categoryId._id === selectedCategory;
    const matchesDateFrom = !dateFrom || new Date(income.date) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(income.date) <= new Date(dateTo);

    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  const totalIncome = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h2">
              Income Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconPlus />}
              onClick={handleCreateIncome}
            >
              Add Income
            </Button>
          </Box>

          {/* Filters */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search income..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <IconSearch size={20} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                select
                label="Category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category._id} value={category._id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Summary */}
          <Box mb={3} p={2} bgcolor="primary.light" borderRadius={1}>
            <Typography variant="h6" color="primary.main">
              Total Income: ${totalIncome.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredIncomes.length} record(s) found
            </Typography>
          </Box>

          {/* Income Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIncomes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No income records found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncomes.map((income) => (
                    <TableRow key={income._id} hover>
                      <TableCell>
                        {format(new Date(income.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{income.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={income.categoryId.name}
                          size="small"
                          color={income.categoryId.isDefault ? 'default' : 'primary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          ${income.amount.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {income.saleId && (
                            <Chip label="Sale" size="small" color="info" />
                          )}
                          {income.isRecurring && (
                            <Chip label="Recurring" size="small" color="warning" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit Income">
                          <IconButton
                            size="small"
                            onClick={() => handleEditIncome(income)}
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Income">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteIncome(income)}
                          >
                            <IconTrash size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Income Form Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIncome ? 'Edit Income' : 'Add New Income'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <IncomeForm
            income={editingIncome}
            onSuccess={handleFormSuccess}
            onCancel={() => setOpenForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this income record?
          </Typography>
          {incomeToDelete && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2">
                <strong>Description:</strong> {incomeToDelete.description}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong> ${incomeToDelete.amount.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {format(new Date(incomeToDelete.date), 'MMM dd, yyyy')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncomeList;