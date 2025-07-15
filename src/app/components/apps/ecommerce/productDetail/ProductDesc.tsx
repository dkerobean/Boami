'use client'
import React from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import { IconPackage } from '@tabler/icons-react';
import ChildCard from '../../../../components/shared/ChildCard';
import { useProductDetail } from "@/hooks/useProductDetail";
import { htmlToPlainText } from "@/lib/utils/html-utils";


const ProductDesc = () => {
  const params = useParams();
  
  // Get product ID from URL parameters
  const productId = params?.id as string;
  
  // Use the custom hook to fetch product data
  const { product, loading, error } = useProductDetail(productId);

  return (
    <ChildCard>
      <Box>
        <Typography variant="h5" mb={3}>
          Product Description
        </Typography>
          {loading ? (
            <Stack spacing={2}>
              <Skeleton variant="text" width="80%" height={32} />
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="text" width="90%" height={20} />
              <Skeleton variant="text" width="95%" height={20} />
            </Stack>
          ) : error || !product ? (
            <Typography color="textSecondary">
              Product description not available.
            </Typography>
          ) : (
            <>
              {/* Product Description */}
              <Typography color="textSecondary" variant="body1" paragraph>
                {product.description ? htmlToPlainText(product.description) : 'No detailed description available for this product.'}
              </Typography>

              <Divider sx={{ my: 3 }} />

              {/* Product Details */}
              <Grid container spacing={3} mt={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Product Details
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">SKU:</Typography>
                      <Typography>{product.sku || 'N/A'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">Brand:</Typography>
                      <Typography>{product.brand || 'Unbranded'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">Category:</Typography>
                      <Typography>
                        {Array.isArray(product.category) 
                          ? product.category.join(', ') 
                          : product.category || 'Uncategorized'
                        }
                      </Typography>
                    </Box>
                    {product.weight && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="textSecondary">Weight:</Typography>
                        <Typography>{product.weight} kg</Typography>
                      </Box>
                    )}
                    {product.dimensions && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="textSecondary">Dimensions:</Typography>
                        <Typography>
                          {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Additional Information
                  </Typography>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconPackage size="1.2rem" />
                      <Typography>
                        Stock: {product.stock ? 'In Stock' : 'Out of Stock'} 
                        {product.qty !== undefined && ` (${product.qty} available)`}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Tags */}
                  {product.tags && product.tags.length > 0 && (
                    <Box mt={3}>
                      <Typography variant="subtitle2" gutterBottom>
                        Tags:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {product.tags.map((tag, index) => (
                          <Typography
                            key={index}
                            variant="caption"
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              color: 'text.secondary'
                            }}
                          >
                            {tag}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </>
          )}
      </Box>
    </ChildCard>
  );
};

export default ProductDesc;
