'use client'
import React from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import { IconPencil, IconPackage, IconTruck, IconShield } from '@tabler/icons-react';
import ChildCard from '../../../../components/shared/ChildCard';
import { useProductDetail } from "@/hooks/useProductDetail";

interface ProductCardProps {
  like: number;
  star: number;
  value?: number;
}

interface TabProps {
  children: React.ReactNode;
  index: number;
  value?: number;
}

// progress
function ProgressBar({ like, star, value, ...others }: ProductCardProps) {
  return (
    <Box display={'flex'} alignItems="center" gap="20px">
      <Box sx={{ minWidth: 50 }}>
        <Typography variant="body2" color="textSecondary">{`${Math.round(star)} Stars`}</Typography>
      </Box>
      <Box sx={{ width: '100%' }}>
        <LinearProgress value={value} variant="determinate" color="primary" {...others} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="subtitle2">{`(${Math.round(like)})`}</Typography>
      </Box>
    </Box>
  );
}

const TabPanel = (props: TabProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
};

const ProductDesc = () => {
  const [value, setValue] = React.useState(0);
  const params = useParams();
  
  // Get product ID from URL parameters
  const productId = params?.id as string;
  
  // Use the custom hook to fetch product data
  const { product, loading, error } = useProductDetail(productId);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <ChildCard>
      <Box>
        <Box sx={{ borderBottom: 1, borderColor: 'grey.100' }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
            textColor="primary"
            allowScrollButtonsMobile
            scrollButtons
            indicatorColor="primary"
          >
            <Tab label="Description" {...a11yProps(0)} />
            <Tab label="Reviews" {...a11yProps(1)} />
          </Tabs>
        </Box>
        {/* ------------------------------------------- */}
        {/* Description Tab */}
        {/* ------------------------------------------- */}
        <TabPanel value={value} index={0}>
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
              <Typography variant="h5" gutterBottom>
                Product Description
              </Typography>
              <Typography color="textSecondary" variant="body1" paragraph>
                {product.description || 'No detailed description available for this product.'}
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
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconTruck size="1.2rem" />
                      <Typography>Free shipping on orders over $50</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconShield size="1.2rem" />
                      <Typography>30-day return policy</Typography>
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
        </TabPanel>
        {/* ------------------------------------------- */}
        {/* Reviews Tab */}
        {/* ------------------------------------------- */}
        <TabPanel value={value} index={1}>
          {loading ? (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={4}>
                <Skeleton variant="rounded" height={200} />
              </Grid>
              <Grid item xs={12} lg={4}>
                <Skeleton variant="rounded" height={200} />
              </Grid>
              <Grid item xs={12} lg={4}>
                <Skeleton variant="rounded" height={200} />
              </Grid>
            </Grid>
          ) : error || !product ? (
            <Typography color="textSecondary">
              Reviews not available for this product.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {/* ------------------------------------------- */}
              {/* Average Rate Tab */}
              {/* ------------------------------------------- */}
              <Grid item xs={12} lg={4}>
                <Paper variant="outlined" sx={{ height: '100%', p: 3 }}>
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                    sx={{ height: '100%' }}
                  >
                    <Typography variant="subtitle1">Average Rating</Typography>
                    <Typography variant="h1" color="primary" fontWeight={600}>
                      {product.rating || 0}/5
                    </Typography>
                    <Rating name="rate" value={product.rating || 0} readOnly />
                    <Typography variant="body2" color="textSecondary">
                      Based on {product.ratingCount || 0} reviews
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
              {/* ------------------------------------------- */}
              {/* Progress Rate Tab */}
              {/* ------------------------------------------- */}
              <Grid item xs={12} lg={4}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Rating Breakdown
                  </Typography>
                  <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
                    <Grid item xs={12}>
                      <ProgressBar star={5} value={60} like={Math.floor((product.ratingCount || 0) * 0.6)} />
                    </Grid>
                    <Grid item xs={12}>
                      <ProgressBar star={4} value={80} like={Math.floor((product.ratingCount || 0) * 0.25)} />
                    </Grid>
                    <Grid item xs={12}>
                      <ProgressBar star={3} value={20} like={Math.floor((product.ratingCount || 0) * 0.1)} />
                    </Grid>
                    <Grid item xs={12}>
                      <ProgressBar star={2} value={10} like={Math.floor((product.ratingCount || 0) * 0.03)} />
                    </Grid>
                    <Grid item xs={12}>
                      <ProgressBar star={1} value={5} like={Math.floor((product.ratingCount || 0) * 0.02)} />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              {/* ------------------------------------------- */}
              {/* Button */}
              {/* ------------------------------------------- */}
              <Grid item xs={12} lg={4}>
                <Paper sx={{ height: '100%', p: 3 }} variant="outlined">
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                    sx={{ height: '100%' }}
                  >
                    <Typography variant="h6" textAlign="center" mb={1}>
                      Share Your Experience
                    </Typography>
                    <Typography variant="body2" color="textSecondary" textAlign="center" mb={2}>
                      Help other customers by writing a review
                    </Typography>
                    <Button variant="outlined" size="large" startIcon={<IconPencil />}>
                      Write a Review
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </Box>
    </ChildCard>
  );
};

export default ProductDesc;
