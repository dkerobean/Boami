"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  InputAdornment,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  IconSearch,
  IconShoppingCart,
  IconPackage,
  IconFilter,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { ProductType } from "@/app/(dashboard)/types/apps/eCommerce";
import { InvoiceItem } from "@/app/(dashboard)/types/apps/invoice";
import axios from 'axios';
import toast from 'react-hot-toast';

interface ProductSelectorProps {
  open: boolean;
  onClose: () => void;
  onProductSelect: (product: InvoiceItem) => void;
  selectedProducts?: InvoiceItem[];
}


const ProductSelector: React.FC<ProductSelectorProps> = ({
  open,
  onClose,
  onProductSelect,
  selectedProducts = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [stockFilter, setStockFilter] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch products from API
  const fetchProducts = async (resetProducts = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        category: selectedCategory,
        stockStatus: stockFilter,
        page: resetProducts ? '1' : page.toString(),
        limit: '20'
      });

      const response = await axios.get(`/api/products?${params}`);
      
      if (response.data.success) {
        const newProducts = response.data.data || [];
        if (resetProducts) {
          setProducts(newProducts);
          setPage(1);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
          setPage(prev => prev + 1);
        }
        
        // Set hasMore based on whether we got a full page of results
        setHasMore(newProducts.length >= 20);
        
        // Set categories, ensuring "All" is not in the list
        const cats = response.data.categories || [];
        setCategories(cats.filter((cat: string) => cat !== "All"));
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error: any) {
      toast.error('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        setPage(1);
        setHasMore(true);
        fetchProducts(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, searchTerm, selectedCategory, stockFilter]);

  const handleProductSelect = (product: ProductType) => {
    const invoiceItem: InvoiceItem = {
      productId: product.id?.toString(),
      itemName: product.title,
      sku: product.sku || `SKU-${product.id}`,
      description: `${product.title} - ${product.category.join(", ")}`,
      unitPrice: product.salesPrice || product.price,
      units: 1,
      unitTotalPrice: product.salesPrice || product.price,
      image: product.photo,
    };

    onProductSelect(invoiceItem);
    toast.success(`${product.title} added to invoice`);
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some(item => item.productId === productId);
  };

  const handleClose = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setStockFilter("All");
    setProducts([]);
    setPage(1);
    setHasMore(true);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { 
          height: "90vh",
          maxHeight: "90vh",
          width: "95vw",
          maxWidth: "1400px"
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <IconPackage />
            <Typography variant="h6">Select Products</Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <IconX />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {/* Search and Filters */}
        <Stack spacing={2} mb={3}>
          <TextField
            fullWidth
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={2}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel size="small">Category</InputLabel>
              <Select
                size="small"
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                {categories.filter(cat => cat !== "All").map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel size="small">Stock Status</InputLabel>
              <Select
                size="small"
                value={stockFilter}
                label="Stock Status"
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="In Stock">In Stock</MenuItem>
                <MenuItem value="Out of Stock">Out of Stock</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {/* Products Grid */}
        <Box sx={{ height: "calc(90vh - 200px)", overflow: "auto", pr: 1 }}>
          {loading && products.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : products.length > 0 ? (
            <Grid container spacing={3}>
              {products.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card
                    sx={{
                      height: "320px",
                      cursor: "pointer",
                      border: isProductSelected(product.id?.toString()) ? "2px solid" : "1px solid",
                      borderColor: isProductSelected(product.id?.toString()) ? "success.main" : "divider",
                      "&:hover": {
                        boxShadow: 4,
                        transform: "translateY(-2px)",
                      },
                      transition: "all 0.3s ease-in-out",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onClick={() => !isProductSelected(product.id?.toString()) && handleProductSelect(product)}
                  >
                    <Box position="relative" sx={{ height: "180px", overflow: "hidden" }}>
                      {product.photo ? (
                        <CardMedia
                          component="img"
                          height="180"
                          image={product.photo}
                          alt={product.title}
                          sx={{ 
                            objectFit: "cover",
                            backgroundColor: "grey.50",
                            p: 0.5,
                            borderRadius: 1
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: "100%",
                            bgcolor: "grey.50",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconPackage size={40} color="#999" />
                        </Box>
                      )}
                      
                      {/* Selected Badge */}
                      {isProductSelected(product.id?.toString()) && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            bgcolor: "success.main",
                            color: "white",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconCheck size={14} />
                        </Box>
                      )}

                      {/* Stock Status Badge */}
                      <Chip
                        size="small"
                        label={product.stock && product.qty > 0 ? "In Stock" : "Out of Stock"}
                        color={product.stock && product.qty > 0 ? "success" : "error"}
                        sx={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          fontSize: "0.6rem",
                          height: "18px",
                        }}
                      />
                    </Box>

                    <CardContent sx={{ p: 2, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                      <Typography 
                        variant="subtitle2" 
                        fontWeight="bold" 
                        gutterBottom 
                        noWrap
                        title={product.title}
                      >
                        {product.title}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        {product.sku || `SKU-${product.id}`}
                      </Typography>

                      <Chip
                        label={product.category[0] || "General"}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.6rem", height: "20px", alignSelf: "flex-start", mb: 1 }}
                      />

                      <Box sx={{ mt: "auto" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Box>
                            {product.discount > 0 ? (
                              <Stack direction="column">
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ textDecoration: "line-through", lineHeight: 1 }}
                                >
                                  ${product.price.toFixed(2)}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary.main">
                                  ${product.salesPrice.toFixed(2)}
                                </Typography>
                              </Stack>
                            ) : (
                              <Typography variant="body2" fontWeight="bold" color="primary.main">
                                ${product.price.toFixed(2)}
                              </Typography>
                            )}
                          </Box>

                          <Typography variant="caption" color="text.secondary">
                            Qty: {product.qty}
                          </Typography>
                        </Stack>

                        {!isProductSelected(product.id?.toString()) ? (
                          <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            startIcon={<IconShoppingCart size={16} />}
                            disabled={!product.stock || product.qty === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductSelect(product);
                            }}
                            sx={{ fontSize: "0.75rem", py: 0.5 }}
                          >
                            Add to Invoice
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            color="success"
                            startIcon={<IconCheck size={16} />}
                            disabled
                            sx={{ fontSize: "0.75rem", py: 0.5 }}
                          >
                            Added
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              
              {/* Load More Button */}
              {hasMore && !loading && (
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Button
                      variant="outlined"
                      onClick={() => fetchProducts(false)}
                      disabled={loading}
                    >
                      Load More Products
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              py={4}
            >
              <IconPackage size={64} color="grey" />
              <Typography variant="h6" color="text.secondary" mt={2}>
                No products found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filters
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {selectedProducts.length} product(s) selected
        </Typography>
        <Button onClick={handleClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductSelector;