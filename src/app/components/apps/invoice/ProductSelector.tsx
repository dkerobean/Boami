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
} from "@mui/material";
import {
  IconSearch,
  IconShoppingCart,
  IconPackage,
  IconFilter,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { ProductType } from "@/app/(DashboardLayout)/types/apps/eCommerce";
import { InvoiceItem } from "@/app/(DashboardLayout)/types/apps/invoice";

interface ProductSelectorProps {
  open: boolean;
  onClose: () => void;
  onProductSelect: (product: InvoiceItem) => void;
  selectedProducts?: InvoiceItem[];
}

// Mock product data - in real implementation, this would come from your product API
const mockProducts: ProductType[] = [
  {
    id: "1",
    title: "Premium Wireless Headphones",
    price: 299.99,
    discount: 10,
    salesPrice: 269.99,
    category: ["Electronics", "Audio"],
    stock: true,
    qty: 50,
    rating: 4.5,
    related: false,
    gender: "Unisex",
    photo: "/images/products/headphones.jpg",
    colors: ["Black", "White", "Silver"],
    created: new Date(),
  },
  {
    id: "2", 
    title: "Smart Fitness Watch",
    price: 199.99,
    discount: 15,
    salesPrice: 169.99,
    category: ["Electronics", "Wearables"],
    stock: true,
    qty: 30,
    rating: 4.3,
    related: false,
    gender: "Unisex",
    photo: "/images/products/watch.jpg",
    colors: ["Black", "Blue", "Rose Gold"],
    created: new Date(),
  },
  {
    id: "3",
    title: "Organic Cotton T-Shirt",
    price: 29.99,
    discount: 0,
    salesPrice: 29.99,
    category: ["Clothing", "Shirts"],
    stock: true,
    qty: 100,
    rating: 4.7,
    related: false,
    gender: "Unisex",
    photo: "/images/products/tshirt.jpg",
    colors: ["White", "Black", "Navy", "Grey"],
    created: new Date(),
  },
  {
    id: "4",
    title: "Bluetooth Speaker",
    price: 79.99,
    discount: 20,
    salesPrice: 63.99,
    category: ["Electronics", "Audio"],
    stock: false,
    qty: 0,
    rating: 4.2,
    related: false,
    gender: "Unisex",
    photo: "/images/products/speaker.jpg",
    colors: ["Black", "Red", "Blue"],
    created: new Date(),
  },
];

const ProductSelector: React.FC<ProductSelectorProps> = ({
  open,
  onClose,
  onProductSelect,
  selectedProducts = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<ProductType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [stockFilter, setStockFilter] = useState<string>("All");

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(mockProducts.flatMap(p => p.category)))];

  useEffect(() => {
    let filtered = mockProducts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(product =>
        product.category.includes(selectedCategory)
      );
    }

    // Filter by stock status
    if (stockFilter === "In Stock") {
      filtered = filtered.filter(product => product.stock && product.qty > 0);
    } else if (stockFilter === "Out of Stock") {
      filtered = filtered.filter(product => !product.stock || product.qty === 0);
    }

    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, stockFilter]);

  const handleProductSelect = (product: ProductType) => {
    const invoiceItem: InvoiceItem = {
      productId: product.id,
      itemName: product.title,
      sku: `SKU-${product.id}`,
      description: `${product.title} - ${product.category.join(", ")}`,
      unitPrice: product.salesPrice || product.price,
      units: 1,
      unitTotalPrice: product.salesPrice || product.price,
      image: product.photo,
    };

    onProductSelect(invoiceItem);
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some(item => item.productId === productId);
  };

  const handleClose = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setStockFilter("All");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: "80vh" }
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
        <Box mb={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
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
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Stock Status</InputLabel>
                <Select
                  value={stockFilter}
                  label="Stock Status"
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="In Stock">In Stock</MenuItem>
                  <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Products Grid */}
        <Box sx={{ height: "400px", overflow: "auto" }}>
          {filteredProducts.length > 0 ? (
            <Grid container spacing={2}>
              {filteredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <Card
                    sx={{
                      height: "100%",
                      cursor: "pointer",
                      border: isProductSelected(product.id) ? "2px solid" : "1px solid",
                      borderColor: isProductSelected(product.id) ? "success.main" : "divider",
                      "&:hover": {
                        boxShadow: 3,
                        transform: "translateY(-2px)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                    onClick={() => !isProductSelected(product.id) && handleProductSelect(product)}
                  >
                    <Box position="relative">
                      {product.photo ? (
                        <CardMedia
                          component="img"
                          height="140"
                          image={product.photo}
                          alt={product.title}
                          sx={{ objectFit: "cover" }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 140,
                            bgcolor: "grey.100",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconPackage size={48} color="grey" />
                        </Box>
                      )}
                      
                      {/* Stock Status Badge */}
                      <Chip
                        size="small"
                        label={product.stock && product.qty > 0 ? "In Stock" : "Out of Stock"}
                        color={product.stock && product.qty > 0 ? "success" : "error"}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                        }}
                      />

                      {/* Selected Badge */}
                      {isProductSelected(product.id) && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            bgcolor: "success.main",
                            color: "white",
                            borderRadius: "50%",
                            width: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconCheck size={16} />
                        </Box>
                      )}
                    </Box>

                    <CardContent>
                      <Typography variant="h6" fontSize="14px" gutterBottom noWrap>
                        {product.title}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        SKU: SKU-{product.id}
                      </Typography>

                      <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1}>
                        {product.category.slice(0, 2).map((cat) => (
                          <Chip
                            key={cat}
                            label={cat}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.65rem" }}
                          />
                        ))}
                      </Stack>

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          {product.discount > 0 ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ textDecoration: "line-through" }}
                              >
                                ${product.price.toFixed(2)}
                              </Typography>
                              <Typography variant="h6" color="primary.main">
                                ${product.salesPrice.toFixed(2)}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography variant="h6" color="primary.main">
                              ${product.price.toFixed(2)}
                            </Typography>
                          )}
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          Qty: {product.qty}
                        </Typography>
                      </Box>

                      {!isProductSelected(product.id) && (
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          startIcon={<IconShoppingCart />}
                          sx={{ mt: 1 }}
                          disabled={!product.stock || product.qty === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductSelect(product);
                          }}
                        >
                          Add to Invoice
                        </Button>
                      )}

                      {isProductSelected(product.id) && (
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          color="success"
                          startIcon={<IconCheck />}
                          sx={{ mt: 1 }}
                          disabled
                        >
                          Added to Invoice
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
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