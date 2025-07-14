import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { WordPressProduct, WordPressConnectionConfig } from '../../app/(DashboardLayout)/types/apps/eCommerce';

/**
 * WordPress WooCommerce API Integration Service
 * Handles authentication and product data fetching from WordPress sites
 */

export interface WooCommerceAuth {
  consumerKey: string;
  consumerSecret: string;
}

export interface WordPressAPIOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  rateLimitDelay?: number;
}

export interface ProductFilter {
  status?: 'any' | 'draft' | 'pending' | 'private' | 'publish';
  category?: string;
  tag?: string;
  featured?: boolean;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  per_page?: number;
  page?: number;
  orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';
  order?: 'asc' | 'desc';
  search?: string;
  after?: string;
  before?: string;
}

export interface ImportProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  currentPage: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export class WordPressAPI {
  private api: AxiosInstance;
  private baseUrl: string;
  private auth: WooCommerceAuth;
  private options: WordPressAPIOptions;

  constructor(
    connection: WordPressConnectionConfig,
    options: WordPressAPIOptions = {}
  ) {
    this.baseUrl = connection.siteUrl.replace(/\/$/, '');
    this.auth = {
      consumerKey: connection.consumerKey,
      consumerSecret: connection.consumerSecret
    };
    
    this.options = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      rateLimitDelay: 500,
      ...options
    };

    this.api = axios.create({
      baseURL: `${this.baseUrl}/wp-json/${connection.version}`,
      timeout: this.options.timeout,
      auth: {
        username: this.auth.consumerKey,
        password: this.auth.consumerSecret
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Boami-Integration/1.0'
      }
    });

    // Add response interceptor for error handling and rate limiting
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limited, wait and retry
          await this.delay(this.options.rateLimitDelay!);
          return this.api.request(error.config);
        }
        
        if (error.response?.status >= 500 && this.options.retries! > 0) {
          // Server error, retry with exponential backoff
          const retryCount = error.config.__retryCount || 0;
          if (retryCount < this.options.retries!) {
            error.config.__retryCount = retryCount + 1;
            const delay = this.options.retryDelay! * Math.pow(2, retryCount);
            await this.delay(delay);
            return this.api.request(error.config);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test the connection to WordPress/WooCommerce
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const response = await this.api.get('/products', {
        params: { per_page: 1 }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        return {
          success: true,
          message: 'Connection successful',
          responseTime
        };
      } else {
        return {
          success: false,
          message: `Unexpected response status: ${response.status}`,
          responseTime
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        if (status === 401) {
          return {
            success: false,
            message: 'Authentication failed. Please check your consumer key and secret.',
            responseTime
          };
        } else if (status === 404) {
          return {
            success: false,
            message: 'WooCommerce API endpoint not found. Please ensure WooCommerce is installed and REST API is enabled.',
            responseTime
          };
        } else {
          return {
            success: false,
            message: `HTTP ${status}: ${message}`,
            responseTime
          };
        }
      } else if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Connection refused. Please check the site URL and ensure the site is accessible.',
          responseTime
        };
      } else if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: 'Site not found. Please check the site URL.',
          responseTime
        };
      } else {
        return {
          success: false,
          message: `Connection error: ${error.message}`,
          responseTime
        };
      }
    }
  }

  /**
   * Get total number of products
   */
  async getProductCount(filters: ProductFilter = {}): Promise<number> {
    try {
      const response = await this.api.get('/products', {
        params: {
          ...filters,
          per_page: 1
        }
      });
      
      const totalHeader = response.headers['x-wp-total'];
      return totalHeader ? parseInt(totalHeader, 10) : 0;
    } catch (error) {
      console.error('Error getting product count:', error);
      return 0;
    }
  }

  /**
   * Fetch products with pagination
   */
  async getProducts(filters: ProductFilter = {}): Promise<{
    products: WordPressProduct[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const params = {
        per_page: 100, // Maximum allowed by WooCommerce
        page: 1,
        ...filters
      };

      const response = await this.api.get('/products', { params });
      
      const products = response.data || [];
      const total = parseInt(response.headers['x-wp-total'] || '0', 10);
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
      const currentPage = params.page;

      return {
        products,
        total,
        totalPages,
        currentPage
      };
    } catch (error: any) {
      console.error('Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Fetch all products with automatic pagination
   */
  async getAllProducts(
    filters: ProductFilter = {},
    onProgress?: (progress: ImportProgress) => void
  ): Promise<WordPressProduct[]> {
    const allProducts: WordPressProduct[] = [];
    let currentPage = 1;
    let totalPages = 1;
    let total = 0;
    const startTime = Date.now();

    try {
      // Get first page to determine total
      const firstPageResult = await this.getProducts({
        ...filters,
        page: currentPage,
        per_page: 100
      });

      allProducts.push(...firstPageResult.products);
      total = firstPageResult.total;
      totalPages = firstPageResult.totalPages;

      // Report initial progress
      if (onProgress) {
        onProgress({
          total,
          processed: firstPageResult.products.length,
          success: firstPageResult.products.length,
          failed: 0,
          currentPage,
          percentage: Math.round((firstPageResult.products.length / total) * 100)
        });
      }

      // Fetch remaining pages
      for (currentPage = 2; currentPage <= totalPages; currentPage++) {
        // Add delay to avoid overwhelming the server
        await this.delay(this.options.rateLimitDelay!);

        const pageResult = await this.getProducts({
          ...filters,
          page: currentPage,
          per_page: 100
        });

        allProducts.push(...pageResult.products);

        // Calculate progress
        const processed = allProducts.length;
        const percentage = Math.round((processed / total) * 100);
        const elapsedTime = Date.now() - startTime;
        const avgTimePerProduct = elapsedTime / processed;
        const estimatedTimeRemaining = (total - processed) * avgTimePerProduct;

        if (onProgress) {
          onProgress({
            total,
            processed,
            success: processed,
            failed: 0,
            currentPage,
            percentage,
            estimatedTimeRemaining
          });
        }
      }

      return allProducts;
    } catch (error: any) {
      console.error('Error fetching all products:', error);
      throw new Error(`Failed to fetch all products: ${error.message}`);
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: number): Promise<WordPressProduct> {
    try {
      const response = await this.api.get(`/products/${productId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching product ${productId}:`, error);
      throw new Error(`Failed to fetch product ${productId}: ${error.message}`);
    }
  }

  /**
   * Get product variations
   */
  async getProductVariations(productId: number): Promise<any[]> {
    try {
      const response = await this.api.get(`/products/${productId}/variations`, {
        params: { per_page: 100 }
      });
      return response.data || [];
    } catch (error: any) {
      console.error(`Error fetching variations for product ${productId}:`, error);
      return [];
    }
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<any[]> {
    try {
      const response = await this.api.get('/products/categories', {
        params: { per_page: 100 }
      });
      return response.data || [];
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get product tags
   */
  async getTags(): Promise<any[]> {
    try {
      const response = await this.api.get('/products/tags', {
        params: { per_page: 100 }
      });
      return response.data || [];
    } catch (error: any) {
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  /**
   * Get product attributes
   */
  async getAttributes(): Promise<any[]> {
    try {
      const response = await this.api.get('/products/attributes', {
        params: { per_page: 100 }
      });
      return response.data || [];
    } catch (error: any) {
      console.error('Error fetching attributes:', error);
      return [];
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: string, limit: number = 50): Promise<WordPressProduct[]> {
    try {
      const response = await this.api.get('/products', {
        params: {
          search: query,
          per_page: Math.min(limit, 100)
        }
      });
      return response.data || [];
    } catch (error: any) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Get store information
   */
  async getStoreInfo(): Promise<any> {
    try {
      const response = await this.api.get('/system_status');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching store info:', error);
      throw new Error(`Failed to fetch store info: ${error.message}`);
    }
  }

  /**
   * Check if WooCommerce is active and API is available
   */
  async checkWooCommerceStatus(): Promise<{
    isActive: boolean;
    version?: string;
    features: string[];
  }> {
    try {
      const response = await this.api.get('');
      const data = response.data;
      
      return {
        isActive: true,
        version: data.version || 'Unknown',
        features: data.routes ? Object.keys(data.routes) : []
      };
    } catch (error: any) {
      return {
        isActive: false,
        features: []
      };
    }
  }

  /**
   * Batch fetch products with automatic retries and error handling
   */
  async batchFetchProducts(
    productIds: number[],
    onProgress?: (completed: number, total: number, failed: string[]) => void
  ): Promise<{ products: WordPressProduct[]; failed: string[] }> {
    const products: WordPressProduct[] = [];
    const failed: string[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the API

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (id) => {
        try {
          const product = await this.getProduct(id);
          products.push(product);
        } catch (error: any) {
          failed.push(`Product ${id}: ${error.message}`);
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches
      if (i + batchSize < productIds.length) {
        await this.delay(this.options.rateLimitDelay!);
      }

      if (onProgress) {
        onProgress(i + batch.length, productIds.length, failed);
      }
    }

    return { products, failed };
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get API endpoint info
   */
  getEndpointInfo(): { baseUrl: string; apiUrl: string; version: string } {
    const apiUrl = this.api.defaults.baseURL || '';
    const version = apiUrl.split('/').pop() || 'unknown';
    
    return {
      baseUrl: this.baseUrl,
      apiUrl,
      version
    };
  }

  /**
   * Update connection configuration
   */
  updateConnection(connection: WordPressConnectionConfig): void {
    this.baseUrl = connection.siteUrl.replace(/\/$/, '');
    this.auth = {
      consumerKey: connection.consumerKey,
      consumerSecret: connection.consumerSecret
    };
    
    // Update axios instance
    this.api.defaults.baseURL = `${this.baseUrl}/wp-json/${connection.version}`;
    this.api.defaults.auth = {
      username: this.auth.consumerKey,
      password: this.auth.consumerSecret
    };
  }
}