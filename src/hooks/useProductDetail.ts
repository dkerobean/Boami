import { useState, useEffect } from 'react';
import { ProductType } from '@/app/(dashboard)/types/apps/eCommerce';

interface UseProductDetailState {
  product: ProductType | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

interface UseProductDetailReturn extends UseProductDetailState {
  refetch: () => void;
}

/**
 * Custom hook for fetching individual product details from the API
 * Handles loading states, error handling, and proper ObjectId validation
 */
export const useProductDetail = (productId: string | null | undefined): UseProductDetailReturn => {
  const [state, setState] = useState<UseProductDetailState>({
    product: null,
    loading: true,
    error: null,
    notFound: false,
  });

  const fetchProduct = async () => {
    // Validate productId - accept any non-empty string
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      setState({
        product: null,
        loading: false,
        error: 'Product ID is required',
        notFound: true,
      });
      return;
    }

    // Clean the product ID (remove whitespace)
    const cleanId = productId.trim();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/products/${cleanId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setState({
            product: null,
            loading: false,
            error: 'Product not found',
            notFound: true,
          });
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch product');
      }

      // Map the product data to ensure compatibility with existing components
      const product = result.data.product;
      const mappedProduct: ProductType = {
        ...product,
        id: product._id || product.id,
        created: product.createdAt || product.created || new Date(),
        updated: product.updatedAt || product.updated || new Date(),
        // Ensure required fields have defaults for backwards compatibility
        stock: product.stock !== undefined ? product.stock : (product.qty || 0) > 0,
        rating: product.rating || 0,
        category: Array.isArray(product.category) 
          ? product.category 
          : [product.category].filter(Boolean),
        colors: product.colors || [],
        tags: product.tags || [],
        gallery: product.gallery || [],
        // Map pricing fields for compatibility
        salesPrice: product.salesPrice || product.salePrice || product.price,
        regularPrice: product.regularPrice || product.price,
        // Ensure photo field exists
        photo: product.photo || (product.gallery && product.gallery[0]) || '',
      };

      setState({
        product: mappedProduct,
        loading: false,
        error: null,
        notFound: false,
      });

    } catch (error) {
      console.error('Error fetching product:', error);
      setState({
        product: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
        notFound: false,
      });
    }
  };

  // Effect to fetch product when productId changes
  useEffect(() => {
    fetchProduct();
  }, [productId]);

  return {
    ...state,
    refetch: fetchProduct,
  };
};

export default useProductDetail;