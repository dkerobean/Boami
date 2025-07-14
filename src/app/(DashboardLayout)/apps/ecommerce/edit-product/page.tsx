"use client";
import { Box, Button, Grid, Stack, Alert, CircularProgress, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";

import GeneralCard from "@/app/components/apps/ecommerce/productEdit/GeneralCard";
import MediaCard from "@/app/components/apps/ecommerce/productEdit/Media";
import VariationCard from "@/app/components/apps/ecommerce/productEdit/VariationCard";
import PricingCard from "@/app/components/apps/ecommerce/productEdit/Pricing";
import Thumbnail from "@/app/components/apps/ecommerce/productEdit/Thumbnail";
import StatusCard from "@/app/components/apps/ecommerce/productEdit/Status";
import ProductDetails from "@/app/components/apps/ecommerce/productEdit/ProductDetails";
import ProductTemplate from "@/app/components/apps/ecommerce/productEdit/ProductTemplate";
import CustomersReviews from "@/app/components/apps/ecommerce/productEdit/CustomersReviews";
import ProductAvgSales from "@/app/components/apps/ecommerce/productEdit/ProductAvgSales";
import BlankCard from "@/app/components/shared/BlankCard";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Edit Product",
  },
];

const EcommerceEditProduct = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const productId = searchParams.get('id');

  useEffect(() => {
    if (!productId) {
      setError("Product ID is required");
      setLoading(false);
      return;
    }

    const fetchProductData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch product data');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setProductData(result.data.product);
        } else {
          throw new Error(result.error || 'Failed to fetch product');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  const handleImageChange = (file: File) => {
    setImageFile(file);
  };

  const handleSaveChanges = async () => {
    let imageUrl = productData.photo;

    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const result = await response.json();
        imageUrl = result.data.url;
      } catch (error) {
        console.error("Error uploading image:", error);
        setError("Failed to upload image");
        return;
      }
    }

    const updatedProduct = { ...productData, photo: imageUrl };

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProduct),
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      router.push("/apps/ecommerce/list");
    } catch (error) {
      console.error("Error saving product:", error);
      setError("Failed to save product");
    }
  };

  if (loading) {
    return (
      <PageContainer title="Edit Product" description="Loading product data">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error || !productData) {
    return (
      <PageContainer title="Edit Product" description="Error loading product">
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || "Product not found"}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => router.push('/apps/ecommerce/list')}
        >
          Back to Product List
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Edit ${productData.title || 'Product'}`} description="Edit product details">
      <>
        {/* breadcrumb */}
        <Breadcrumb title={`Edit Product: ${productData.title || 'Unknown'}`} items={BCrumb} />
        
        {/* Development note: Product data is available in productData variable */}
        {process.env.NODE_ENV === 'development' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Development Note: Product data loaded for ID {productId}. 
              Form components need to be updated to use productData for pre-population.
            </Typography>
          </Alert>
        )}
      
      <form>
        <Grid container spacing={3}>
          <Grid item lg={8}>
            <Stack spacing={3}>
              <BlankCard>
                <GeneralCard />
              </BlankCard>

              <BlankCard>
                <MediaCard />
              </BlankCard>

              <BlankCard>
                <VariationCard />
              </BlankCard>

              <BlankCard>
                <PricingCard />
              </BlankCard>

              <BlankCard>
                <CustomersReviews />
              </BlankCard>
            </Stack>
          </Grid>

          <Grid item lg={4}>
            <Stack spacing={3}>
              <BlankCard>
                <Thumbnail product={productData} onImageChange={handleImageChange} />
              </BlankCard>

              <BlankCard>
                <StatusCard />
              </BlankCard>

              <BlankCard>
                <ProductDetails />
              </BlankCard>

              <BlankCard>
                <ProductAvgSales />
              </BlankCard>

              <BlankCard>
                <ProductTemplate />
              </BlankCard>
            </Stack>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} mt={3}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveChanges}
          >
            Save Changes
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={() => router.push('/apps/ecommerce/list')}
          >
            Cancel
          </Button>
        </Stack>
        </form>
      </>
    </PageContainer>
  );
};

export default EcommerceEditProduct;
