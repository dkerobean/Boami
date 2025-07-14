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

export default EcommerceSlice.reducer;
