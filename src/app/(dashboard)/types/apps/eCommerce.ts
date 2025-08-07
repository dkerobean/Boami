
export interface ProductType {
  title: string;
  price: number;
  discount: number;
  related: boolean;
  salesPrice: number;
  category: string[];
  gender: string;
  rating: number;
  stock: boolean;
  qty: number;
  colors: string[];
  photo: string;
  id: number | string;
  created: Date | string;  // Allow both Date and string to handle API responses
  description: string;
  // WordPress integration fields
  wordpress?: {
    id: number;
    sourceUrl: string;
    slug: string;
    lastSync: Date;
    syncStatus: 'synced' | 'pending' | 'error' | 'never';
    errorMessage?: string;
    images: string[];
    variations?: WordPressVariation[];
  };
  sku?: string;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  status: 'draft' | 'pending' | 'private' | 'publish';
  tags: string[];
  weight?: number;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  // Enhanced inventory management fields
  regularPrice?: number;
  salePrice?: number;
  stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
  manageStock?: boolean;
  backordersAllowed?: boolean;
  lowStockThreshold?: number;
  featured?: boolean;
  virtual?: boolean;
  downloadable?: boolean;
  brand?: string;
  subcategory?: string[];
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  gallery?: string[];
  averageRating?: number;
  ratingCount?: number;
  reviewsAllowed?: boolean;
  relatedIds?: string[];
  upsellIds?: string[];
  crossSellIds?: string[];
  variations?: ProductVariantType[];
  createdBy?: string;
  updatedBy?: string;
}

export interface ProductFiterType {
  id: number;
  filterbyTitle?: string;
  name?: string;
  sort?: string;
  icon?:  any;
  devider?: boolean;
}

export interface ProductCardProps {
  id?: string | number;
  color?: string;
  like: string;
  star: number;
  value?: string;
}

// WordPress Integration Interfaces
export interface WordPressVariation {
  id: number;
  sku: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  stockQuantity: number;
  attributes: {
    id: number;
    name: string;
    option: string;
  }[];
  image?: {
    id: number;
    src: string;
    alt: string;
  };
}

export interface WordPressConnectionConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version: string;
  isWooCommerce: boolean;
  lastTestDate?: Date;
  isActive: boolean;
}

export interface WordPressImportJob {
  id: string;
  siteUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    imported: number;
    updated: number;
    failed: number;
  };
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  filters?: {
    categories?: string[];
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  };
}

export interface WordPressProduct {
  id: number;
  name: string;
  slug: string;
  type: 'simple' | 'grouped' | 'external' | 'variable';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  catalogVisibility: 'visible' | 'catalog' | 'search' | 'hidden';
  description: string;
  shortDescription: string;
  sku: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  priceHtml: string;
  onSale: boolean;
  purchasable: boolean;
  totalSales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  downloadLimit: number;
  downloadExpiry: number;
  externalUrl: string;
  buttonText: string;
  taxStatus: 'taxable' | 'shipping' | 'none';
  taxClass: string;
  manageStock: boolean;
  stockQuantity: number;
  stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backordersAllowed: boolean;
  backordered: boolean;
  soldIndividually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shippingRequired: boolean;
  shippingTaxable: boolean;
  shippingClass: string;
  shippingClassId: number;
  reviewsAllowed: boolean;
  averageRating: string;
  ratingCount: number;
  relatedIds: number[];
  upsellIds: number[];
  crossSellIds: number[];
  parentId: number;
  purchaseNote: string;
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  tags: {
    id: number;
    name: string;
    slug: string;
  }[];
  images: {
    id: number;
    dateCreated: string;
    dateCreatedGmt: string;
    dateModified: string;
    dateModifiedGmt: string;
    src: string;
    name: string;
    alt: string;
  }[];
  attributes: {
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }[];
  defaultAttributes: any[];
  variations: number[];
  groupedProducts: number[];
  menuOrder: number;
  metaData: {
    id: number;
    key: string;
    value: string;
  }[];
  dateCreated: string;
  dateCreatedGmt: string;
  dateModified: string;
  dateModifiedGmt: string;
}

// Enhanced Product and Inventory Management Types

export interface ProductVariantType {
  id: string;
  productId: string;
  sku: string;
  attributes: {
    name: string;
    value: string;
  }[];
  pricing: {
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    currency: string;
  };
  inventory: {
    quantity: number;
    reserved: number;
    available: number;
    lowStockThreshold: number;
    backordersAllowed: boolean;
  };
  images?: {
    url: string;
    alt: string;
    order: number;
  }[];
  status: 'active' | 'inactive';
  isDefault: boolean;
  weight?: number;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  wordpress?: {
    id: number;
    lastSync: Date;
    syncStatus: 'synced' | 'pending' | 'error' | 'never';
    errorMessage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLogType {
  id: string;
  productId?: string;
  variantId?: string;
  sku: string;
  type: 'adjustment' | 'sale' | 'return' | 'damage' | 'restock' | 'reservation' | 'release' | 'import';
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  orderId?: string;
  importJobId?: string;
  userId: string;
  reason?: string;
  source: 'manual' | 'order' | 'import' | 'api' | 'system' | 'wordpress_sync';
  location?: string;
  batchNumber?: string;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
}

export interface StockAlertType {
  id: string;
  productId?: string;
  variantId?: string;
  sku: string;
  alertType: 'low_stock' | 'out_of_stock' | 'high_demand' | 'restock_needed' | 'overstock';
  priority: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  currentStock: number;
  recommendedAction?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  notificationsSent: {
    email: Date[];
    sms: Date[];
    push: Date[];
    dashboard: Date[];
  };
  message: string;
  severity: number;
  estimatedImpact?: {
    potentialLostSales: number;
    affectedOrders: number;
    revenueAtRisk: number;
  };
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  autoResolve: boolean;
  autoResolveThreshold?: number;
  suppressUntil?: Date;
  suppressSimilar: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// CSV Import/Export Types
export interface CSVImportJobType {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
    percentage: number;
  };
  results: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: {
    row: number;
    field?: string;
    message: string;
  }[];
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

export interface CSVMappingType {
  csvField: string;
  productField: string;
  required: boolean;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'date';
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

// Form and UI Types
export interface ProductFormData {
  general: {
    title: string;
    description: string;
      sku?: string;
    type: 'simple' | 'variable';
    status: 'draft' | 'pending' | 'private' | 'publish';
    featured: boolean;
    virtual: boolean;
    downloadable: boolean;
  };
  categories: {
    category: string[];
    subcategory?: string[];
    brand?: string;
    tags: string[];
  };
  pricing: {
    price: number;
    regularPrice?: number;
    salePrice?: number;
    discount: number;
    currency: string;
  };
  inventory: {
    manageStock: boolean;
    quantity: number;
    lowStockThreshold: number;
    stockStatus: 'instock' | 'outofstock' | 'onbackorder';
    backordersAllowed: boolean;
  };
  shipping: {
    weight?: number;
    dimensions?: {
      length: string;
      width: string;
      height: string;
    };
  };
  media: {
    photo: string;
    gallery?: string[];
  };
  seo: {
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
  variants?: ProductVariantFormData[];
}

export interface ProductVariantFormData {
  sku: string;
  attributes: {
    name: string;
    value: string;
  }[];
  pricing: {
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
  };
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    backordersAllowed: boolean;
  };
  images?: {
    url: string;
    alt: string;
  }[];
  status: 'active' | 'inactive';
  isDefault: boolean;
  weight?: number;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
}

// Filter and Search Types
export interface ProductFilterType {
  search?: string;
  category?: string[];
  brand?: string[];
  status?: string[];
  stockStatus?: string[];
  type?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  featured?: boolean;
  wordpress?: {
    hasWordPress?: boolean;
    syncStatus?: string[];
  };
  inventory?: {
    lowStock?: boolean;
    outOfStock?: boolean;
    inStock?: boolean;
  };
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ProductSortType {
  field: 'title' | 'price' | 'created' | 'updated' | 'rating' | 'qty' | 'salesPrice';
  direction: 'asc' | 'desc';
}

// Inventory Dashboard Types
export interface InventoryStatsType {
  totalProducts: number;
  totalVariants: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overstockItems: number;
  averageStockLevel: number;
  stockTurnoverRate: number;
  topSellingProducts: {
    id: string;
    title: string;
    sku: string;
    salesCount: number;
    revenue: number;
  }[];
  recentStockMovements: InventoryLogType[];
  activeAlerts: StockAlertType[];
}

// Bulk Operations Types
export interface BulkOperationType {
  operation: 'update_price' | 'update_stock' | 'update_status' | 'delete' | 'export' | 'sync_wordpress';
  productIds: string[];
  data?: {
    [key: string]: any;
  };
  filters?: ProductFilterType;
}

export interface BulkUpdateResultType {
  success: boolean;
  processed: number;
  updated: number;
  failed: number;
  errors: {
    productId: string;
    error: string;
  }[];
  jobId?: string;
}

// API Response Types
export interface ProductListResponse {
  products: ProductType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ProductFilterType;
  sort: ProductSortType;
}

export interface ProductResponse {
  success: boolean;
  data?: ProductType;
  error?: string;
  message?: string;
}

export interface InventoryResponse {
  success: boolean;
  data?: {
    product?: ProductType;
    variants?: ProductVariantType[];
    logs?: InventoryLogType[];
    alerts?: StockAlertType[];
    stats?: InventoryStatsType;
  };
  error?: string;
  message?: string;
}
