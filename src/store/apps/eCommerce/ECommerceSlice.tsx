import axios from '../../../utils/axios';
import { filter, map } from 'lodash';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from '../../store';

const API_URL = '/api/products';

interface StateType {
  products: any[];
  productSearch: string;
  sortBy: string;
  cart: any[];
  total: number;
  filters: {
    category: string;
    color: string;
    gender: string;
    price: string;
    rating: string;
  };
  error: string;
  // Inventory and bulk operations
  stockAlerts: any[];
  stockAlertsLoading: boolean;
  bulkUploadJobs: any[];
  bulkUploadLoading: boolean;
  bulkExportJobs: any[];
  bulkExportLoading: boolean;
  inventoryStats: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    activeAlerts: number;
  };
}

const initialState = {
  products: [],
  productSearch: '',
  sortBy: 'newest',
  cart: [],
  total: 0,
  filters: {
    category: 'All',
    color: 'All',
    gender: 'All',
    price: 'All',
    rating: '',
  },
  error: '',
  // Inventory and bulk operations
  stockAlerts: [],
  stockAlertsLoading: false,
  bulkUploadJobs: [],
  bulkUploadLoading: false,
  bulkExportJobs: [],
  bulkExportLoading: false,
  inventoryStats: {
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    activeAlerts: 0,
  },
};

export const EcommerceSlice = createSlice({
  name: 'ecommerce',
  initialState,
  reducers: {
    // HAS ERROR

    hasError(state: StateType, action) {
      state.error = action.payload;
    },

    // GET PRODUCTS
    getProducts: (state, action) => {
      state.products = action.payload;
    },
    SearchProduct: (state, action) => {
      state.productSearch = action.payload;
    },

    //  SORT  PRODUCTS
    sortByProducts(state, action) {
      state.sortBy = action.payload;
    },

    //  SORT  PRODUCTS
    sortByGender(state, action) {
      state.filters.gender = action.payload.gender;
    },

    //  SORT  By Color
    sortByColor(state, action) {
      state.filters.color = action.payload.color;
    },

    //  SORT  By Color
    sortByPrice(state, action) {
      state.filters.price = action.payload.price;
    },

    //  FILTER PRODUCTS
    filterProducts(state, action) {
      state.filters.category = action.payload.category;
    },

    //  FILTER Reset
    filterReset(state) {
      state.filters.category = 'All';
      state.filters.color = 'All';
      state.filters.gender = 'All';
      state.filters.price = 'All';
      state.sortBy = 'newest';
    },

    // ADD TO CART
    addToCart(state: StateType, action) {
      const product = action.payload;
      state.cart = [...state.cart, product];
    },

    // qty increment
    increment(state: StateType, action) {
      const productId = action.payload;
      const updateCart = map(state.cart, (product) => {
        if (product.id === productId) {
          return {
            ...product,
            qty: product.qty + 1,
          };
        }

        return product;
      });

      state.cart = updateCart;
    },

    // qty decrement
    decrement(state: StateType, action) {
      const productId = action.payload;
      const updateCart = map(state.cart, (product) => {
        if (product.id === productId) {
          return {
            ...product,
            qty: product.qty - 1,
          };
        }

        return product;
      });

      state.cart = updateCart;
    },

    // delete Cart
    deleteCart(state: StateType, action) {
      const updateCart = filter(state.cart, (item) => item.id !== action.payload);
      state.cart = updateCart;
    },

    // DELETE PRODUCT
    deleteProduct(state: StateType, action) {
      const productId = action.payload;
      state.products = state.products.filter((product) => 
        (product.id || product._id) !== productId
      );
    },

    // UPDATE PRODUCT
    updateProduct(state: StateType, action) {
      const updatedProduct = action.payload;
      const index = state.products.findIndex((product) => 
        (product.id || product._id) === (updatedProduct.id || updatedProduct._id)
      );
      if (index !== -1) {
        state.products[index] = updatedProduct;
      }
    },

    // STOCK ALERTS
    setStockAlertsLoading(state: StateType, action) {
      state.stockAlertsLoading = action.payload;
    },
    setStockAlerts(state: StateType, action) {
      state.stockAlerts = action.payload;
    },
    addStockAlert(state: StateType, action) {
      state.stockAlerts.push(action.payload);
    },
    updateStockAlert(state: StateType, action) {
      const updatedAlert = action.payload;
      const index = state.stockAlerts.findIndex((alert) => alert.id === updatedAlert.id);
      if (index !== -1) {
        state.stockAlerts[index] = updatedAlert;
      }
    },
    removeStockAlert(state: StateType, action) {
      const alertId = action.payload;
      state.stockAlerts = state.stockAlerts.filter((alert) => alert.id !== alertId);
    },

    // BULK UPLOAD
    setBulkUploadLoading(state: StateType, action) {
      state.bulkUploadLoading = action.payload;
    },
    setBulkUploadJobs(state: StateType, action) {
      state.bulkUploadJobs = action.payload;
    },
    addBulkUploadJob(state: StateType, action) {
      state.bulkUploadJobs.push(action.payload);
    },
    updateBulkUploadJob(state: StateType, action) {
      const updatedJob = action.payload;
      const index = state.bulkUploadJobs.findIndex((job) => job.id === updatedJob.id);
      if (index !== -1) {
        state.bulkUploadJobs[index] = updatedJob;
      }
    },
    removeBulkUploadJob(state: StateType, action) {
      const jobId = action.payload;
      state.bulkUploadJobs = state.bulkUploadJobs.filter((job) => job.id !== jobId);
    },

    // BULK EXPORT
    setBulkExportLoading(state: StateType, action) {
      state.bulkExportLoading = action.payload;
    },
    setBulkExportJobs(state: StateType, action) {
      state.bulkExportJobs = action.payload;
    },
    addBulkExportJob(state: StateType, action) {
      state.bulkExportJobs.push(action.payload);
    },
    updateBulkExportJob(state: StateType, action) {
      const updatedJob = action.payload;
      const index = state.bulkExportJobs.findIndex((job) => job.id === updatedJob.id);
      if (index !== -1) {
        state.bulkExportJobs[index] = updatedJob;
      }
    },
    removeBulkExportJob(state: StateType, action) {
      const jobId = action.payload;
      state.bulkExportJobs = state.bulkExportJobs.filter((job) => job.id !== jobId);
    },

    // INVENTORY STATS
    setInventoryStats(state: StateType, action) {
      state.inventoryStats = action.payload;
    },
    updateInventoryStats(state: StateType, action) {
      state.inventoryStats = { ...state.inventoryStats, ...action.payload };
    },
  },
});
export const {
  hasError,
  getProducts,
  SearchProduct,
  sortByProducts,
  filterProducts,
  sortByGender,
  increment,
  deleteCart,
  decrement,
  addToCart,
  sortByPrice,
  filterReset,
  sortByColor,
  deleteProduct,
  updateProduct,
  // Stock alerts
  setStockAlertsLoading,
  setStockAlerts,
  addStockAlert,
  updateStockAlert,
  removeStockAlert,
  // Bulk upload
  setBulkUploadLoading,
  setBulkUploadJobs,
  addBulkUploadJob,
  updateBulkUploadJob,
  removeBulkUploadJob,
  // Bulk export
  setBulkExportLoading,
  setBulkExportJobs,
  addBulkExportJob,
  updateBulkExportJob,
  removeBulkExportJob,
  // Inventory stats
  setInventoryStats,
  updateInventoryStats,
} = EcommerceSlice.actions;

export const fetchProducts = () => async (dispatch: AppDispatch) => {
  try {
    console.log('Fetching products from:', API_URL);
    const response = await axios.get(`${API_URL}`);
    console.log('API Response:', response.data);
    
    // Our API returns { success: true, data: { products: [...], pagination: {...} } }
    let products = response.data.data?.products || response.data.products || response.data;
    
    // Ensure products is an array
    if (!Array.isArray(products)) {
      console.warn('Products data is not an array:', products);
      products = [];
    }
    
    // Validate and clean product data
    const validatedProducts = products.map((product: any, index: number) => {
      try {
        return {
          ...product,
          id: product.id || product._id || `temp-${index}`,
          title: product.title || 'Untitled Product',
          price: product.price || product.salesPrice || 0,
          created: product.created || product.createdAt || new Date(),
          category: Array.isArray(product.category) ? product.category : [product.category].filter(Boolean),
          stock: product.stock !== undefined ? product.stock : (product.qty || 0) > 0,
          qty: product.qty || 0,
          rating: product.rating || 0,
          photo: product.photo || '',
          colors: product.colors || [],
          description: product.description || '',
          related: product.related || false,
          salesPrice: product.salesPrice || product.price || 0,
          discount: product.discount || 0,
          gender: product.gender || 'unisex'
        };
      } catch (productError) {
        console.error(`Error processing product at index ${index}:`, productError, product);
        return null;
      }
    }).filter(Boolean); // Remove null entries
    
    console.log('Validated products:', validatedProducts);
    dispatch(getProducts(validatedProducts));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to fetch products'));
  }
};

// Stock Alerts Actions
export const fetchStockAlerts = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setStockAlertsLoading(true));
    const response = await axios.get('/api/stock-alerts');
    dispatch(setStockAlerts(response.data.data));
    
    // Update inventory stats
    const stats = response.data.statistics;
    dispatch(updateInventoryStats({
      activeAlerts: stats.active,
    }));
  } catch (error) {
    console.error('Failed to fetch stock alerts:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to fetch stock alerts'));
  } finally {
    dispatch(setStockAlertsLoading(false));
  }
};

export const createStockAlert = (alertData: any) => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.post('/api/stock-alerts', alertData);
    dispatch(addStockAlert(response.data.data));
    return response.data;
  } catch (error) {
    console.error('Failed to create stock alert:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to create stock alert'));
    throw error;
  }
};

export const updateStockAlertAsync = (alertId: string, updateData: any) => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.put(`/api/stock-alerts/${alertId}`, updateData);
    dispatch(updateStockAlert(response.data.data));
    return response.data;
  } catch (error) {
    console.error('Failed to update stock alert:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to update stock alert'));
    throw error;
  }
};

export const deleteStockAlert = (alertId: string) => async (dispatch: AppDispatch) => {
  try {
    await axios.delete(`/api/stock-alerts/${alertId}`);
    dispatch(removeStockAlert(alertId));
  } catch (error) {
    console.error('Failed to delete stock alert:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to delete stock alert'));
    throw error;
  }
};

// Bulk Upload Actions
export const fetchBulkUploadJobs = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setBulkUploadLoading(true));
    const response = await axios.get('/api/bulk-upload');
    dispatch(setBulkUploadJobs(response.data.data));
  } catch (error) {
    console.error('Failed to fetch bulk upload jobs:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to fetch bulk upload jobs'));
  } finally {
    dispatch(setBulkUploadLoading(false));
  }
};

export const createBulkUploadJob = (jobData: any) => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.post('/api/bulk-upload', jobData);
    dispatch(addBulkUploadJob(response.data.data));
    return response.data;
  } catch (error) {
    console.error('Failed to create bulk upload job:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to create bulk upload job'));
    throw error;
  }
};

export const validateBulkUploadData = (validationData: any) => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.post('/api/bulk-upload/validate', validationData);
    return response.data;
  } catch (error) {
    console.error('Failed to validate bulk upload data:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to validate bulk upload data'));
    throw error;
  }
};

// Bulk Export Actions
export const fetchBulkExportJobs = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setBulkExportLoading(true));
    const response = await axios.get('/api/bulk-export');
    dispatch(setBulkExportJobs(response.data.data));
  } catch (error) {
    console.error('Failed to fetch bulk export jobs:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to fetch bulk export jobs'));
  } finally {
    dispatch(setBulkExportLoading(false));
  }
};

export const createBulkExportJob = (exportData: any) => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.post('/api/bulk-export', exportData);
    dispatch(addBulkExportJob(response.data.data));
    return response.data;
  } catch (error) {
    console.error('Failed to create bulk export job:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to create bulk export job'));
    throw error;
  }
};

export const cancelBulkExportJob = (jobId: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.put(`/api/bulk-export/${jobId}`, { action: 'cancel' });
    dispatch(updateBulkExportJob(response.data.data));
    return response.data;
  } catch (error) {
    console.error('Failed to cancel bulk export job:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to cancel bulk export job'));
    throw error;
  }
};

export const deleteBulkExportJob = (jobId: string) => async (dispatch: AppDispatch) => {
  try {
    await axios.delete(`/api/bulk-export/${jobId}`);
    dispatch(removeBulkExportJob(jobId));
  } catch (error) {
    console.error('Failed to delete bulk export job:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to delete bulk export job'));
    throw error;
  }
};

// Inventory Stats Actions
export const fetchInventoryStats = () => async (dispatch: AppDispatch) => {
  try {
    // In a real implementation, you would have a dedicated endpoint for inventory stats
    // For now, we'll calculate from existing data
    const [productsResponse, alertsResponse] = await Promise.all([
      axios.get('/api/products'),
      axios.get('/api/stock-alerts'),
    ]);
    
    const products = productsResponse.data.data?.products || [];
    const alerts = alertsResponse.data.statistics || {};
    
    const stats = {
      totalProducts: products.length,
      lowStockCount: products.filter((p: any) => p.qty <= 10).length,
      outOfStockCount: products.filter((p: any) => p.qty === 0).length,
      activeAlerts: alerts.active || 0,
    };
    
    dispatch(setInventoryStats(stats));
  } catch (error) {
    console.error('Failed to fetch inventory stats:', error);
    dispatch(hasError(error instanceof Error ? error.message : 'Failed to fetch inventory stats'));
  }
};

export default EcommerceSlice.reducer;
