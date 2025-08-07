'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { IconSearch, IconPackage } from '@tabler/icons-react';
import Breadcrumb from '@/app/(dashboard)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import ProductTableList from '@/app/components/apps/ecommerce/ProductTableList/ProductTableList';
import BlankCard from '@/app/components/shared/BlankCard';
import { useSelector } from '@/store/hooks';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Product List',
  },
];

const EcomProductList = () => {
  const [searchValue, setSearchValue] = useState('');
  const [filteredCount, setFilteredCount] = useState(0);

  // Get products from Redux store to calculate filtered count
  const getProducts = useSelector((state) => state.ecommerceReducer.products);

  // Calculate filtered products count based on search
  useEffect(() => {
    if (!Array.isArray(getProducts)) {
      setFilteredCount(0);
      return;
    }

    if (searchValue.trim()) {
      const filtered = getProducts.filter((product: any) => {
        const title = product.title || '';
        const description = product.description || '';
        const category = Array.isArray(product.category) 
          ? product.category.join(' ') 
          : (product.category || '');
        const sku = product.sku || '';
        
        return (
          title.toLowerCase().includes(searchValue.toLowerCase()) ||
          description.toLowerCase().includes(searchValue.toLowerCase()) ||
          category.toLowerCase().includes(searchValue.toLowerCase()) ||
          sku.toLowerCase().includes(searchValue.toLowerCase())
        );
      });
      setFilteredCount(filtered.length);
    } else {
      setFilteredCount(getProducts.length);
    }
  }, [getProducts, searchValue]);

  return (
    <PageContainer title="Product List" description="Browse and manage your product catalog">
      {/* Breadcrumb */}
      <Breadcrumb title="Product List" items={BCrumb} />
      
      {/* Search and Filter Bar */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Product Catalog
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Search and browse your product inventory
              </Typography>
            </Box>
            
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }}>
              <TextField
                placeholder="Search products by name, SKU, category, or description..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                fullWidth
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={20} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                  maxWidth: { md: 400 }
                }}
              />
              
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Chip
                  icon={<IconPackage size={16} />}
                  label={searchValue.trim() 
                    ? `${filteredCount} of ${getProducts?.length || 0} products`
                    : `${filteredCount} products`
                  }
                  variant="outlined"
                  size="small"
                />
                {searchValue.trim() && (
                  <Chip
                    label={`"${searchValue}"`}
                    onDelete={() => setSearchValue('')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Product Table */}
      <BlankCard>
        <ProductTableList searchValue={searchValue} />
      </BlankCard>
    </PageContainer>
  );
};

export default EcomProductList;
