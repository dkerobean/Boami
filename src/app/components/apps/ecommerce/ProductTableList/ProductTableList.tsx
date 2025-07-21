'use client'
import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { alpha, useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useSelector, useDispatch } from '@/store/hooks';
import { fetchProducts, deleteProduct } from '@/store/apps/eCommerce/ECommerceSlice';
import CustomCheckbox from '../../../forms/theme-elements/CustomCheckbox';
import CustomSwitch from '../../../forms/theme-elements/CustomSwitch';
import { IconDotsVertical, IconSearch, IconTrash, IconEdit, IconEye } from '@tabler/icons-react';
import { ProductType } from '../../../../(DashboardLayout)/types/apps/eCommerce';
import ProductImage from '../../../shared/ProductImage';
import { getImageSource, createImageAltText, shouldPrioritizeImage, IMAGE_SIZES } from '@/lib/utils/image-utils';
import { ToastProvider, useToast } from '../../../shared/ToastContext';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }

  return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort<T>(array: T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }

    return a[1] - b[1];
  });

  return stabilizedThis.map((el) => el[0]);
}

interface HeadCell {
  disablePadding: boolean;
  id: string;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  {
    id: 'name',
    numeric: false,
    disablePadding: false,
    label: 'Products',
  },
  {
    id: 'pname',
    numeric: false,
    disablePadding: false,
    label: 'Date',
  },

  {
    id: 'status',
    numeric: false,
    disablePadding: false,
    label: 'Status',
  },
  {
    id: 'price',
    numeric: false,
    disablePadding: false,
    label: 'Price',
  },
  {
    id: 'action',
    numeric: false,
    disablePadding: false,
    label: 'Actions',
  },
];

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: any) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: string;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const createSortHandler = (property: any) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <CustomCheckbox
            color="primary"
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all desserts',
            }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}


const ProductTableListContent: React.FC<{ searchValue: string }> = ({ searchValue }) => {
  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<any>('calories');
  const [selected, setSelected] = React.useState<readonly string[]>([]);
  const [page, setPage] = React.useState(0);
  const [dense, setDense] = React.useState(false);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();
  const { showToast } = useToast();

  //Fetch Products
  React.useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const getProducts: ProductType[] = useSelector((state) => state.ecommerceReducer.products);
  const error = useSelector((state) => state.ecommerceReducer.error);

  const [rows, setRows] = React.useState<any>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Validate products data before setting
    const validProducts = Array.isArray(getProducts) ? getProducts : [];
    
    // Filter based on external searchValue prop
    if (searchValue.trim()) {
      const filteredProducts = validProducts.filter((row) => {
        const title = row.title || '';
        const description = row.description || '';
        const category = Array.isArray(row.category) ? row.category.join(' ') : (row.category || '');
        const sku = row.sku || '';
        return title.toLowerCase().includes(searchValue.toLowerCase()) || 
               description.toLowerCase().includes(searchValue.toLowerCase()) ||
               category.toLowerCase().includes(searchValue.toLowerCase()) ||
               sku.toLowerCase().includes(searchValue.toLowerCase());
      });
      setRows(filteredProducts);
    } else {
      setRows(validProducts);
    }
    
    setLoading(false);
  }, [getProducts, searchValue]);

  // Handle loading state
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <Box 
          sx={{
            width: 40,
            height: 40,
            border: '3px solid',
            borderColor: 'primary.light',
            borderTopColor: 'primary.main',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        />
        <Typography variant="body1" color="textSecondary">
          Loading products...
        </Typography>
      </Box>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <Box 
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            bgcolor: 'error.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'error.main'
          }}
        >
          <IconSearch size={24} />
        </Box>
        <Typography variant="h6" color="error" textAlign="center">
          Failed to load products
        </Typography>
        <Typography variant="body2" color="textSecondary" textAlign="center" maxWidth={400}>
          {error}
        </Typography>
        <Box mt={2}>
          <IconButton 
            onClick={() => dispatch(fetchProducts())} 
            color="primary"
            sx={{ 
              bgcolor: 'primary.light',
              '&:hover': { bgcolor: 'primary.main', color: 'white' }
            }}
          >
            <IconSearch size={20} />
          </IconButton>
        </Box>
      </Box>
    );
  }

  // Handle empty state
  if (!rows || rows.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <Box 
          sx={{
            width: 80,
            height: 80,
            borderRadius: 2,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'grey.500'
          }}
        >
          <IconSearch size={32} />
        </Box>
        <Typography variant="h6" color="textPrimary" textAlign="center">
          No products found
        </Typography>
        <Typography variant="body2" color="textSecondary" textAlign="center" maxWidth={400}>
          {searchValue ? 
            `No products match "${searchValue}". Try adjusting your search terms.` : 
            "Create your first product to get started!"
          }
        </Typography>
      </Box>
    );
  }


  // This is for the sorting
  const handleRequestSort = (event: React.MouseEvent<unknown>, property: any) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // This is for select all the row
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = rows.map((n: any) => n.title);
      setSelected(newSelecteds);

      return;
    }
    setSelected([]);
  };

  // This is for the single row sleect
  const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeDense = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDense(event.target.checked);
  };

  const isSelected = (name: string) => selected.indexOf(name) !== -1;

  // Handle view product
  const handleView = (product: any) => {
    router.push(`/apps/ecommerce/detail/${product.id || product._id}`);
  };

  // Handle edit product
  const handleEdit = (product: any) => {
    router.push(`/apps/ecommerce/edit-product?id=${product.id || product._id}`);
  };

  // Handle delete product
  const handleDeleteClick = (product: any) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    const productId = productToDelete.id || productToDelete._id;
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      // Update Redux store - remove product from list
      dispatch(deleteProduct(productId));
      
      // Show success message
      showToast({
        message: `Product "${productToDelete.title}" has been deleted successfully`,
        severity: 'success'
      });
      
      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast({
        message: 'Failed to delete product. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  return (
    <Box>
      <Box>
        <Paper variant="outlined" sx={{ mx: 2, mt: 1, border: `1px solid ${borderColor}` }}>
          <TableContainer>
            <Table
              sx={{ minWidth: 750 }}
              aria-labelledby="tableTitle"
              size={dense ? 'small' : 'medium'}
            >
              <EnhancedTableHead
                numSelected={selected.length}
                order={order}
                orderBy={orderBy}
                onSelectAllClick={handleSelectAllClick}
                onRequestSort={handleRequestSort}
                rowCount={rows.length}
              />
              <TableBody>
                {stableSort(rows, getComparator(order, orderBy))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row: any, index) => {
                    const isItemSelected = isSelected(row.title);
                    const labelId = `enhanced-table-checkbox-${index}`;

                    return (
                      <TableRow
                        hover
                        onClick={(event) => handleClick(event, row.title)}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        key={row.title}
                        selected={isItemSelected}
                      >
                        <TableCell padding="checkbox">
                          <CustomCheckbox
                            color="primary"
                            checked={isItemSelected}
                            inputProps={{
                              'aria-labelledby': labelId,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <ProductImage
                              src={getImageSource(
                                row.photo,
                                row.gallery?.[0],
                                row.title || row.id?.toString()
                              )}
                              alt={createImageAltText(row.title)}
                              title={row.title}
                              width={IMAGE_SIZES.thumbnail.width}
                              height={IMAGE_SIZES.thumbnail.height}
                              variant="circular"
                              placeholder="text"
                              priority={shouldPrioritizeImage(index, page === 0, true)}
                              sx={{
                                border: '2px solid',
                                borderColor: 'divider',
                                transition: 'border-color 0.2s ease',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                }
                              }}
                            />
                            <Box
                              sx={{
                                ml: 2,
                              }}
                            >
                              <Typography variant="h6" fontWeight="600">
                                {row.title || 'Untitled Product'}
                              </Typography>
                              <Typography color="textSecondary" variant="subtitle2">
                                {Array.isArray(row.category) 
                                  ? row.category.join(', ') || 'Uncategorized'
                                  : row.category || 'Uncategorized'
                                }
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography>
                            {row.created && !isNaN(new Date(row.created).getTime()) 
                              ? format(new Date(row.created), 'E, MMM d yyyy')
                              : 'Invalid Date'
                            }
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Box
                              sx={{
                                backgroundColor: (row.stock !== undefined ? row.stock : (row.qty || 0) > 0)
                                  ? (theme) => theme.palette.success.main
                                  : (theme) => theme.palette.error.main,
                                borderRadius: '100%',
                                height: '10px',
                                width: '10px',
                              }}
                            />
                            <Typography
                              color="textSecondary"
                              variant="subtitle2"
                              sx={{
                                ml: 1,
                              }}
                            >
                              {(row.stock !== undefined ? row.stock : (row.qty || 0) > 0) ? 'InStock' : 'Out of Stock'}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography fontWeight={600} variant="h6">
                            ${row.price || row.salesPrice || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Tooltip title="View Product">
                              <IconButton 
                                size="small" 
                                color="info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleView(row);
                                }}
                              >
                                <IconEye size="1.1rem" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Product">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(row);
                                }}
                              >
                                <IconEdit size="1.1rem" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Product">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(row);
                                }}
                              >
                                <IconTrash size="1.1rem" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {emptyRows > 0 && (
                  <TableRow
                    style={{
                      height: (dense ? 33 : 53) * emptyRows,
                    }}
                  >
                    <TableCell colSpan={6} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={rows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
        <Box ml={2}>
          <FormControlLabel
            control={<CustomSwitch checked={dense} onChange={handleChangeDense} />}
            label="Dense padding"
          />
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Product
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{productToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Main wrapper component with ToastProvider
interface ProductTableListProps {
  searchValue?: string;
}

const ProductTableList: React.FC<ProductTableListProps> = ({ searchValue = '' }) => {
  return (
    <ToastProvider>
      <ProductTableListContent searchValue={searchValue} />
    </ToastProvider>
  );
};

export default ProductTableList;
