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
  const [originalProductData, setOriginalProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
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
          setOriginalProductData(result.data.product);
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

  // Handle product data changes
  const handleProductDataChange = (field: string, value: any) => {
    setProductData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  // Handle categories change
  const handleCategoriesChange = (categories: string[]) => {
    handleProductDataChange('category', categories);
  };

  // Handle tags change
  const handleTagsChange = (tags: string[]) => {
    handleProductDataChange('tags', tags);
  };

  // Handle variations change
  const handleVariationsChange = (variations: any[]) => {
    handleProductDataChange('variations', variations);
  };

  // Handle name change
  const handleNameChange = (name: string) => {
    handleProductDataChange('title', name);
  };

  // Handle description change
  const handleDescriptionChange = (description: string) => {
    handleProductDataChange('description', description);
  };

  // Handle price change
  const handlePriceChange = (price: string) => {
    handleProductDataChange('price', price);
  };

  // Handle stock change
  const handleStockChange = (stock: string) => {
    handleProductDataChange('qty', stock);
  };

  // Handle status change
  const handleStatusChange = (status: string) => {
    handleProductDataChange('status', status);
  };

  const handleSaveChanges = async () => {
    if (!hasChanges && !imageFile) {
      router.push("/apps/ecommerce/list");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let imageUrl = productData.photo;

      // Upload image if changed
      if (imageFile) {
        const oldImageUrl = productData.photo; // Store old image URL for cleanup
        
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch("/api/upload/product-image", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success && uploadResult.data?.url) {
          imageUrl = uploadResult.data.url;
          
          // Clean up old image after successful upload
          if (oldImageUrl && oldImageUrl !== imageUrl && oldImageUrl.startsWith('/uploads/products/')) {
            try {
              await fetch('/api/cleanup/product-image', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: oldImageUrl })
              });
            } catch (cleanupError) {
              console.warn('Failed to cleanup old image:', cleanupError);
              // Don't fail the entire operation if cleanup fails
            }
          }
        } else {
          throw new Error(uploadResult.error || "Image upload failed");
        }
      }

      // Save product data
      const updatedProduct = { ...productData, photo: imageUrl };

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProduct),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save product");
      }

      const result = await response.json();
      if (result.success) {
        // Reset change tracking
        setHasChanges(false);
        setOriginalProductData(updatedProduct);
        
        // Navigate back to list
        router.push("/apps/ecommerce/list");
      } else {
        throw new Error(result.error || "Failed to save product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      setError(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setSaving(false);
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
                <GeneralCard 
                  productData={productData} 
                  onNameChange={handleNameChange}
                  onDescriptionChange={handleDescriptionChange}
                />
              </BlankCard>

              <BlankCard>
                <MediaCard productData={productData} />
              </BlankCard>

              <BlankCard>
                <VariationCard 
                  productData={productData} 
                  onVariationsChange={handleVariationsChange}
                />
              </BlankCard>

              <BlankCard>
                <PricingCard 
                  productData={productData} 
                  onPriceChange={handlePriceChange}
                  onStockChange={handleStockChange}
                />
              </BlankCard>

            </Stack>
          </Grid>

          <Grid item lg={4}>
            <Stack spacing={3}>
              <BlankCard>
                <Thumbnail product={productData} onImageChange={handleImageChange} />
              </BlankCard>

              <BlankCard>
                <StatusCard 
                  productData={productData} 
                  onStatusChange={handleStatusChange}
                />
              </BlankCard>

              <BlankCard>
                <ProductDetails 
                  productData={productData}
                  onCategoriesChange={handleCategoriesChange}
                  onTagsChange={handleTagsChange}
                />
              </BlankCard>

              <BlankCard>
                <ProductAvgSales />
              </BlankCard>

            </Stack>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} mt={3}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveChanges}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={() => router.push('/apps/ecommerce/list')}
            disabled={saving}
          >
            Cancel
          </Button>
          {hasChanges && (
            <Typography variant="body2" color="warning.main" sx={{ alignSelf: 'center' }}>
              You have unsaved changes
            </Typography>
          )}
        </Stack>
        </form>
      </>
    </PageContainer>
  );
};

export default EcommerceEditProduct;
