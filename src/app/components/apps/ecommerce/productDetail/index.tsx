'use client'
import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams, useParams  } from "next/navigation";

// MUI Elements
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Fab from '@mui/material/Fab'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import { useTheme } from '@mui/material/styles'

import { IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { ProductType } from "../../../../(DashboardLayout)/types/apps/eCommerce";
import { useProductDetail } from "@/hooks/useProductDetail";
import { htmlToPlainText } from "@/lib/utils/html-utils";

const ProductDetail = () => {
  const theme = useTheme();
  const params = useParams();
  
  // Get product ID from URL parameters
  const productId = params?.id as string;
  
  // Use the custom hook to fetch product data
  const { product, loading, error, notFound, refetch } = useProductDetail(productId);

  /// select colors on click
  const [scolor, setScolor] = useState("");
  const setColor = (e: string) => {
    setScolor(e);
  };

  // Initialize selected color when product loads
  useEffect(() => {
    if (product && product.colors && product.colors.length > 0) {
      setScolor(product.colors[0]);
    }
  }, [product]);

  // Loading skeleton
  if (loading) {
    return (
      <Box p={2}>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Skeleton variant="rounded" width={80} height={24} />
            <Skeleton variant="text" width={100} />
          </Box>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="40%" height={32} />
          <Stack direction="row" spacing={1} mt={2}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
          </Stack>
          <Stack direction="row" spacing={2} mt={3}>
            <Skeleton variant="rounded" width={120} height={40} />
            <Skeleton variant="rounded" width={120} height={40} />
          </Stack>
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error || notFound) {
    return (
      <Box p={2}>
        <Alert 
          severity={notFound ? "warning" : "error"} 
          icon={<IconAlertCircle />}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Try Again
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            {notFound ? "Product Not Found" : "Error Loading Product"}
          </Typography>
          <Typography variant="body2">
            {notFound 
              ? "The product you're looking for doesn't exist or has been removed."
              : error || "Something went wrong while loading the product details."
            }
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Product loaded successfully
  return (
    <Box p={2}>
      {product && (
        <>
          <Box display="flex" alignItems="center">
            {/* ------------------------------------------- */}
            {/* Badge and category */}
            {/* ------------------------------------------- */}
            <Chip 
              label={product.stock ? "In Stock" : "Out of Stock"} 
              color={product.stock ? "success" : "error"} 
              size="small" 
            />
            <Typography
              color="textSecondary"
              variant="caption"
              ml={1}
              textTransform="capitalize"
            >
              {Array.isArray(product.category) 
                ? product.category.join(', ') 
                : product.category || 'Uncategorized'
              }
            </Typography>
          </Box>
          {/* ------------------------------------------- */}
          {/* Title and description */}
          {/* ------------------------------------------- */}
          <Typography fontWeight="600" variant="h4" mt={1}>
            {product.title || 'Untitled Product'}
          </Typography>
          <Typography
            variant="subtitle2"
            mt={1}
            color={theme.palette.text.secondary}
          >
            {product.description ? htmlToPlainText(product.description, 150) : 'No description available for this product.'}
          </Typography>
          {/* ------------------------------------------- */}
          {/* Price */}
          {/* ------------------------------------------- */}
          <Typography mt={2} variant="h4" fontWeight={600}>
            {product.regularPrice && product.regularPrice > product.price && (
              <Box
                component={"small"}
                color={theme.palette.text.secondary}
                sx={{ textDecoration: "line-through", mr: 1 }}
              >
                ${product.regularPrice}
              </Box>
            )}
            ${product.price || product.salesPrice || 0}
            {product.discount && product.discount > 0 && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.5,
                  bgcolor: 'error.light',
                  color: 'error.main',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                -{product.discount}%
              </Box>
            )}
          </Typography>
          <Divider />
          {/* ------------------------------------------- */}
          {/* Colors */}
          {/* ------------------------------------------- */}
          {product.colors && product.colors.length > 0 && (
            <Stack py={4} direction="row" alignItems="center">
              <Typography variant="h6" mr={1}>
                Colors:
              </Typography>
              <Box>
                {product.colors.map((color: any) => (
                  <Fab
                    color="primary"
                    sx={{
                      transition: "0.1s ease-in",
                      scale: scolor === color ? "0.9" : "0.7",
                      backgroundColor: `${color}`,
                      "&:hover": {
                        backgroundColor: `${color}`,
                        opacity: 0.7,
                      },
                      mr: 1,
                    }}
                    size="small"
                    key={color}
                    onClick={() => setColor(color)}
                  >
                    {scolor === color ? <IconCheck size="1.1rem" /> : ""}
                  </Fab>
                ))}
              </Box>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

export default ProductDetail;
