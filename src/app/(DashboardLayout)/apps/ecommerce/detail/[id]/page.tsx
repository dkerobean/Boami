'use client'
import { useParams } from 'next/navigation'
import Grid from '@mui/material/Grid'
import { Skeleton, Alert } from '@mui/material'
import ProductCarousel from '@/app/components/apps/ecommerce/productDetail/ProductCarousel';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import ProductDetail from '@/app/components/apps/ecommerce/productDetail';
import ProductDesc from '@/app/components/apps/ecommerce/productDetail/ProductDesc';
import ProductRelated from '@/app/components/apps/ecommerce/productDetail/ProductRelated';
import ChildCard from '@/app/components/shared/ChildCard';
import { useProductDetail } from '@/hooks/useProductDetail';

const EcommerceDetail = () => {
  const params = useParams();
  const productId = params?.id as string;
  
  // Use the custom hook to fetch product data for meta information
  const { product, loading, error, notFound } = useProductDetail(productId);

  // Dynamic breadcrumb based on product data
  const BCrumb = [
    {
      to: '/',
      title: 'Home',
    },
    {
      title: 'Shop',
      to: '/apps/ecommerce/shop',
    },
    {
      title: loading ? 'Loading...' : (product?.title || 'Product Detail'),
    },
  ];

  // Dynamic page title and description
  const pageTitle = loading 
    ? 'Loading Product...' 
    : notFound 
      ? 'Product Not Found' 
      : error 
        ? 'Error Loading Product'
        : product 
          ? `${product.title} - Product Detail`
          : 'Product Detail';

  const pageDescription = loading
    ? 'Loading product details...'
    : notFound
      ? 'The product you are looking for could not be found.'
      : error
        ? 'There was an error loading the product details.'
        : product
          ? `${product.title} - ${product.description ? product.description.substring(0, 160) : 'View product details, specifications, and reviews.'}`
          : 'View detailed product information, specifications, and customer reviews.';

  // Error state - show error page
  if (notFound) {
    return (
      <PageContainer title="Product Not Found" description="The product you are looking for could not be found.">
        <Breadcrumb title="Product Not Found" items={BCrumb} />
        <Grid container spacing={3} sx={{ maxWidth: { lg: '1055px', xl: '1200px' } }}>
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <strong>Product Not Found</strong><br />
              The product you are looking for doesn't exist or has been removed.
            </Alert>
          </Grid>
        </Grid>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={pageTitle} description={pageDescription}>
      {/* breadcrumb */}
      <Breadcrumb title={loading ? 'Loading...' : (product?.title || 'Product Detail')} items={BCrumb} />
      
      {loading ? (
        // Loading skeleton for the entire page
        <Grid container spacing={3} sx={{ maxWidth: { lg: '1055px', xl: '1200px' } }}>
          <Grid item xs={12} sm={12} lg={12}>
            <ChildCard>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={12} lg={6}>
                  <Skeleton variant="rounded" width="100%" height={500} />
                </Grid>
                <Grid item xs={12} sm={12} lg={6}>
                  <Skeleton variant="text" width="60%" height={40} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mt: 2 }} />
                  <Skeleton variant="text" width="40%" height={32} sx={{ mt: 2 }} />
                </Grid>
              </Grid>
            </ChildCard>
          </Grid>
          <Grid item xs={12} sm={12} lg={12}>
            <Skeleton variant="rounded" width="100%" height={300} />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3} sx={{ maxWidth: { lg: '1055px', xl: '1200px' } }}>
          <Grid item xs={12} sm={12} lg={12}>
            <ChildCard>
              {/* ------------------------------------------- */}
              {/* Carousel */}
              {/* ------------------------------------------- */}
              <Grid container spacing={3}>
                <Grid item xs={12} sm={12} lg={6}>
                  <ProductCarousel />
                </Grid>
                <Grid item xs={12} sm={12} lg={6}>
                  <ProductDetail />
                </Grid>
              </Grid>
            </ChildCard>
          </Grid>
          <Grid item xs={12} sm={12} lg={12}>
            <ProductDesc />
          </Grid>
          <Grid item xs={12} sm={12} lg={12}>
            <ProductRelated />
          </Grid>
        </Grid>
      )}
    </PageContainer>
  );
};

export default EcommerceDetail;
