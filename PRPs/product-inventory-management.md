name: "Product & Inventory Management - Complete Implementation"
description: |

## Purpose
Implement a comprehensive product and inventory management system with product variants, SKU codes, inventory tracking, low-stock alerts, and bulk CSV/Excel import/export capabilities, following Boami's existing Next.js 14 + TypeScript + Material-UI patterns.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Build a complete product and inventory management system that handles product creation with variants, SKU generation, real-time inventory tracking with low-stock alerts, and bulk CSV/Excel import/export functionality through a Material-UI interface consistent with existing Boami patterns.

## Why
- **Business value**: Core foundation for e-commerce operations - product catalog and inventory are essential
- **Integration**: Provides foundation for order management, analytics, and WooCommerce sync
- **Problems solved**: Manual inventory tracking, lack of variant support, no bulk operations, overselling prevention

## What
A comprehensive product and inventory management module including:
1. **Product Management**: Create/edit products with multiple variants (size, color), SKU codes, pricing, images, categories
2. **Inventory Tracking**: Real-time stock monitoring, low-stock alerts, prevent overselling with reservations
3. **Bulk Operations**: CSV/Excel import/export for product catalogs with validation and error handling

### Success Criteria
- [ ] Product CRUD operations with variant management (size, color, etc.)
- [ ] Automatic SKU generation and manual override capability  
- [ ] Real-time inventory tracking with stock reservations
- [ ] Low-stock alerts with configurable thresholds
- [ ] Bulk CSV/Excel import with validation and error reporting
- [ ] Bulk export functionality for product catalogs
- [ ] Material-UI interface following existing design patterns
- [ ] Prevention of overselling through inventory reservations
- [ ] All features tested and production-ready

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window

# CSV/Excel Import/Export Implementation
- url: https://www.papaparse.com/docs
  why: Official PapaParse documentation for CSV parsing - fastest JavaScript CSV parser
  
- url: https://deadsimplechat.com/blog/csv-files-with-nodejs-papaparse/
  why: Complete guide for Node.js CSV processing with streaming for large files
  
- url: https://betterstack.com/community/guides/scaling-nodejs/parsing-csv-files-with-papa-parse/
  why: Production-ready CSV parsing patterns with error handling and validation

# MongoDB Inventory Management Best Practices
- url: https://www.mongodb.com/solutions/solutions-library/event-driven-inventory-management
  why: Event-driven inventory management using MongoDB Atlas with Change Streams
  
- url: https://www.mongodb.com/blog/post/how-enhance-inventory-management-real-time-data-strategies
  why: Real-time inventory management strategies with MongoDB for preventing overselling
  
- url: https://github.com/mongodb-industry-solutions/inventory-management
  why: Complete MongoDB inventory management implementation example

# E-commerce Schema Design Patterns
- url: https://www.infoq.com/articles/data-model-mongodb/
  why: Sample e-commerce MongoDB data modeling with products and variants
  
- url: https://stackoverflow.com/questions/42295107/mongodb-schema-for-ecommerce-products-that-have-variations-with-different-skus
  why: MongoDB schema patterns for product variants with different SKUs and pricing
  
- url: https://medium.com/@louistrinh/mongoose-schema-modeling-for-e-commerce-products-best-practices-and-considerations-3c5435484fe7
  why: Mongoose schema modeling best practices for e-commerce products

# Existing Codebase Patterns (CRITICAL TO FOLLOW)
- file: src/app/api/eCommerce/ProductsData.ts
  why: Current product data structure and mock API patterns to replace
  
- file: src/app/components/apps/ecommerce/ProductTableList/ProductTableList.tsx
  why: Material-UI table patterns with search, pagination, sorting, and bulk selection
  
- file: src/app/(DashboardLayout)/apps/ecommerce/add-product/page.tsx
  why: Product form page layout with card-based structure and breadcrumbs
  
- file: src/app/components/apps/ecommerce/productAdd/GeneralCard.tsx
  why: Form component patterns using CustomTextField and CustomFormLabel
  
- file: src/app/components/apps/ecommerce/productAdd/VariationCard.tsx
  why: Variant management UI patterns with dynamic add/remove functionality
  
- file: src/app/components/apps/ecommerce/productAdd/Pricing.tsx
  why: Pricing form patterns with discount types and tax configuration
  
- file: src/store/apps/eCommerce/ECommerceSlice.tsx
  why: Redux patterns for async data fetching and state management
  
- file: src/lib/database/models/User.ts
  why: Mongoose model patterns with TypeScript interfaces and validation
  
- file: src/lib/database/mongoose-connection.ts
  why: MongoDB connection patterns with connection pooling and error handling
  
- file: src/app/(DashboardLayout)/types/apps/eCommerce.ts
  why: TypeScript interface patterns for e-commerce types
```

### Current Codebase Architecture
```bash
src/
├── app/
│   ├── (DashboardLayout)/
│   │   ├── apps/
│   │   │   └── ecommerce/                  # Existing e-commerce (EXTEND THIS)
│   │   │       ├── list/page.tsx           # Product list - enhance with inventory
│   │   │       ├── add-product/page.tsx    # Add product - enhance with variants/SKU
│   │   │       ├── edit-product/page.tsx   # Edit product - enhance with inventory
│   │   │       └── shop/page.tsx           # Shop interface
│   │   └── types/apps/
│   │       └── eCommerce.ts                # Basic types (EXTEND)
│   └── api/
│       └── eCommerce/
│           └── ProductsData.ts             # Mock data (REPLACE WITH REAL API)
├── components/
│   └── apps/
│       └── ecommerce/                      # Basic components (EXTEND)
│           ├── ProductTableList/           # Table component (ENHANCE)
│           ├── productAdd/                 # Add form components (ENHANCE)
│           ├── productEdit/                # Edit form components (ENHANCE)
│           └── productGrid/                # Grid components
├── lib/
│   └── database/
│       ├── models/                         # User model exists (ADD PRODUCT MODELS)
│       └── mongoose-connection.ts          # Connection (USE THIS)
├── store/
│   └── apps/
│       └── eCommerce/
│           └── ECommerceSlice.tsx          # Basic Redux (EXTEND)
└── utils/
    └── axios.js                            # HTTP client
```

### Enhanced Architecture After Implementation
```bash
src/
├── app/
│   ├── (DashboardLayout)/
│   │   ├── apps/
│   │   │   └── ecommerce/                  # Enhanced e-commerce
│   │   │       ├── list/page.tsx           # Enhanced with inventory columns
│   │   │       ├── add-product/page.tsx    # Enhanced with variants/SKU
│   │   │       ├── edit-product/page.tsx   # Enhanced with inventory management
│   │   │       ├── inventory/page.tsx      # NEW: Inventory dashboard
│   │   │       ├── import/page.tsx         # NEW: CSV import interface
│   │   │       └── export/page.tsx         # NEW: CSV export interface
│   │   └── types/apps/
│   │       └── eCommerce.ts                # Enhanced with inventory types
│   └── api/
│       ├── products/                       # NEW: Real product API
│       │   ├── route.ts                    # Product CRUD operations
│       │   ├── import/route.ts             # CSV import processing
│       │   ├── export/route.ts             # CSV export generation
│       │   └── [id]/
│       │       ├── route.ts                # Individual product operations
│       │       └── inventory/route.ts      # Inventory management
│       └── inventory/                      # NEW: Inventory API
│           ├── route.ts                    # Inventory tracking
│           ├── alerts/route.ts             # Low stock alerts
│           └── reserve/route.ts            # Stock reservations
├── components/
│   └── apps/
│       └── ecommerce/                      # Enhanced components
│           ├── ProductTableList/           # Enhanced with inventory columns
│           ├── productAdd/                 # Enhanced with variants/SKU
│           ├── productEdit/                # Enhanced with inventory
│           ├── inventory/                  # NEW: Inventory components
│           │   ├── InventoryDashboard.tsx
│           │   ├── StockAlerts.tsx
│           │   └── BulkUpdate.tsx
│           └── import-export/              # NEW: CSV components
│               ├── CSVImport.tsx
│               ├── CSVExport.tsx
│               └── ImportProgress.tsx
├── lib/
│   ├── database/
│   │   └── models/                         # NEW: Product models
│   │       ├── Product.ts                  # Product schema
│   │       ├── ProductVariant.ts           # Variant schema
│   │       ├── Inventory.ts                # Inventory schema
│   │       └── InventoryLog.ts             # Inventory change log
│   └── utils/                              # NEW: Business logic
│       ├── sku-generator.ts                # SKU generation utility
│       ├── inventory-manager.ts            # Inventory operations
│       ├── csv-processor.ts                # CSV import/export logic
│       └── stock-alerts.ts                 # Low stock alert system
├── store/
│   └── apps/
│       └── eCommerce/
│           └── ECommerceSlice.tsx          # Enhanced with inventory state
└── utils/
    ├── csv-utils.ts                        # NEW: CSV processing utilities
    └── validation-schemas.ts               # NEW: Yup validation schemas
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: MongoDB schema design for e-commerce
// Products and SKUs should be separate concerns: Products for marketing, SKUs for logistics
// Use separate collections for high-frequency inventory updates vs master product data
// Implement inventory reservations to prevent overselling in concurrent scenarios

// CRITICAL: CSV Processing with PapaParse
// Use streaming for large product catalogs to prevent memory issues
// papaparse supports both browser and Node.js with different APIs
// Enable dynamicTyping: true for automatic number/boolean conversion
// Always validate CSV data before database operations

// CRITICAL: Inventory Management
// Use MongoDB Change Streams for real-time stock alerts
// Implement database transactions for inventory updates to prevent race conditions
// Stock quantity updates can happen multiple times per second - optimize for performance
// Separate inventory logs from current stock for audit trails

// CRITICAL: File Upload Security
// Use multer with file size limits and file type validation
// Never trust file extensions - validate file content
// Store uploaded files outside web root for security
// Implement virus scanning for production environments

// CRITICAL: Next.js 14 App Router specifics
// API routes require explicit HTTP method handling
// Use NextRequest/NextResponse for proper type safety
// File uploads need special handling with formData()
// Stream responses for large CSV exports

// CRITICAL: Material-UI v5 patterns
// Follow existing CustomTextField and CustomFormLabel patterns
// Use sx prop for styling following existing component patterns
// DataGrid from @mui/x-data-grid for advanced table features
// File upload components need special Material-UI styling

// CRITICAL: TypeScript strict mode compliance
// All Mongoose schemas must have corresponding TypeScript interfaces
// CSV import data needs runtime validation despite TypeScript
// Product variant arrays need proper typing for dynamic operations
// API responses require proper type definitions for frontend consumption

// CRITICAL: Redux Toolkit patterns
// Follow existing ECommerceSlice.tsx structure exactly
// Use createAsyncThunk for all API operations
// Implement proper loading states for CSV operations
// State updates must be immer-safe (no direct mutations)

// CRITICAL: Performance considerations
// Index MongoDB collections for SKU, category, and stock queries
// Use aggregation pipelines for complex inventory calculations
// Implement proper pagination for large product catalogs
// Cache frequently accessed product data
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// Enhanced product and inventory data models with TypeScript interfaces

// Base Product Interface
interface IProduct {
  _id: ObjectId;
  productId: string;          // Internal product ID
  name: string;
  description: string;
  shortDescription?: string;
  category: ObjectId[];       // Reference to categories
  subcategory?: ObjectId[];
  brand?: string;
  tags: string[];
  
  // SEO fields
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    slug: string;
  };
  
  // Product status
  status: 'draft' | 'active' | 'inactive' | 'archived';
  visibility: 'public' | 'private' | 'catalog_only';
  
  // Media
  images: {
    url: string;
    alt: string;
    isPrimary: boolean;
    order: number;
  }[];
  
  // Product type and variants
  type: 'simple' | 'variable' | 'grouped' | 'external';
  hasVariants: boolean;
  variants?: ObjectId[];      // Reference to ProductVariant collection
  
  // Pricing (for simple products or base price)
  pricing: {
    basePrice: number;
    currency: string;
    taxClass: string;
    taxRate: number;
  };
  
  // Physical properties
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  
  // Inventory tracking (for simple products)
  inventory?: {
    trackQuantity: boolean;
    quantity: number;
    lowStockThreshold: number;
    backordersAllowed: boolean;
    sku?: string;
  };
  
  // External integrations
  woocommerce?: {
    id: number;
    lastSync: Date;
    syncStatus: 'synced' | 'pending' | 'error';
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

// Product Variant Interface
interface IProductVariant {
  _id: ObjectId;
  productId: ObjectId;        // Reference to parent product
  sku: string;                // Unique SKU for this variant
  
  // Variant attributes
  attributes: {
    name: string;             // e.g., "Color", "Size"
    value: string;            // e.g., "Red", "Large"
  }[];
  
  // Pricing specific to this variant
  pricing: {
    price: number;
    compareAtPrice?: number;  // Original price for showing discounts
    costPrice?: number;       // For profit calculations
    currency: string;
  };
  
  // Inventory specific to this variant
  inventory: {
    quantity: number;
    reserved: number;         // Reserved for pending orders
    available: number;        // quantity - reserved
    lowStockThreshold: number;
    backordersAllowed: boolean;
  };
  
  // Media specific to variant
  images?: {
    url: string;
    alt: string;
    order: number;
  }[];
  
  // Variant status
  status: 'active' | 'inactive';
  isDefault: boolean;         // Default variant for product
  
  // Physical properties (can override product defaults)
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Inventory Log Interface for tracking changes
interface IInventoryLog {
  _id: ObjectId;
  productId?: ObjectId;
  variantId?: ObjectId;
  sku: string;
  
  // Change details
  type: 'adjustment' | 'sale' | 'return' | 'damage' | 'restock' | 'reservation';
  quantityBefore: number;
  quantityChange: number;     // Positive for increase, negative for decrease
  quantityAfter: number;
  
  // Reference information
  orderId?: ObjectId;         // If related to an order
  userId: ObjectId;           // Who made the change
  reason?: string;            // Optional reason for manual adjustments
  
  // Metadata
  source: 'manual' | 'order' | 'import' | 'api' | 'system';
  
  createdAt: Date;
}

// Stock Alert Interface
interface IStockAlert {
  _id: ObjectId;
  productId?: ObjectId;
  variantId?: ObjectId;
  sku: string;
  
  alertType: 'low_stock' | 'out_of_stock' | 'high_demand';
  threshold: number;
  currentStock: number;
  
  status: 'active' | 'acknowledged' | 'resolved';
  notificationsSent: {
    email: Date[];
    sms: Date[];
  };
  
  createdAt: Date;
  resolvedAt?: Date;
  acknowledgedBy?: ObjectId;
}

// CSV Import Job Interface
interface IImportJob {
  _id: ObjectId;
  fileName: string;
  fileSize: number;
  uploadedBy: ObjectId;
  
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
  };
  
  errors: {
    row: number;
    field?: string;
    message: string;
  }[];
  
  results?: {
    created: number;
    updated: number;
    skipped: number;
  };
  
  createdAt: Date;
  completedAt?: Date;
}
```

### List of Tasks to Complete (In Order)

```yaml
Task 1: Setup Enhanced MongoDB Models
CREATE lib/database/models/Product.ts:
  - PATTERN: Follow User.ts structure with comprehensive schema
  - Include product type (simple/variable), pricing, inventory tracking
  - Add indexes for performance: SKU, category, status, createdAt
  - Implement validation with proper error messages

CREATE lib/database/models/ProductVariant.ts:
  - PATTERN: Reference-based relationship with Product
  - Include variant attributes (color, size), pricing, inventory
  - Ensure unique SKU constraint across variants
  - Add compound indexes for productId + attributes

CREATE lib/database/models/InventoryLog.ts:
  - PATTERN: Audit log for all inventory changes
  - Include change tracking, user references, reasons
  - Implement proper indexing for queries by SKU and date
  - Add aggregation helpers for inventory reports

CREATE lib/database/models/StockAlert.ts:
  - PATTERN: Alert system for low stock notifications
  - Include notification tracking and status management
  - Add TTL indexes for auto-cleanup of old alerts

Task 2: Enhance TypeScript Definitions
UPDATE app/(DashboardLayout)/types/apps/eCommerce.ts:
  - EXTEND existing ProductType interface with variants, inventory
  - ADD new interfaces for inventory management, CSV operations
  - INCLUDE form state types for product add/edit
  - ADD filter and search types for enhanced table

Task 3: Implement Core Utilities
CREATE lib/utils/sku-generator.ts:
  - PATTERN: Configurable SKU generation with prefix/suffix options
  - Support manual override and uniqueness validation
  - Include SKU validation helpers and formatting
  - Implement collision detection and retry logic

CREATE lib/utils/inventory-manager.ts:
  - PATTERN: Central inventory operations with MongoDB transactions
  - Implement stock reservation, release, and adjustment functions
  - Include overselling prevention with proper locking
  - Add batch operations for bulk inventory updates

CREATE lib/utils/csv-processor.ts:
  - PATTERN: Streaming CSV processing with PapaParse
  - Include validation pipeline with detailed error reporting
  - Support both product and variant import/export
  - Implement progress tracking for large files

CREATE lib/utils/stock-alerts.ts:
  - PATTERN: Alert system with MongoDB Change Streams
  - Implement threshold checking and notification triggering
  - Include email/SMS integration preparation
  - Add alert aggregation and reporting functions

Task 4: Create Enhanced API Routes
CREATE app/api/products/route.ts:
  - PATTERN: Follow existing auth API route structure (login/route.ts)
  - GET: List products with filtering, search, pagination
  - POST: Create product with variants and initial inventory
  - PUT: Update product and sync variant changes
  - DELETE: Soft delete with inventory cleanup

CREATE app/api/products/[id]/route.ts:
  - PATTERN: Dynamic route with ID parameter validation
  - GET: Single product with variants and inventory details
  - PUT: Update specific product with variant management
  - DELETE: Individual product deletion with safety checks

CREATE app/api/products/[id]/inventory/route.ts:
  - PATTERN: Nested route for inventory operations
  - GET: Current inventory status and recent changes
  - POST: Manual inventory adjustments with logging
  - PUT: Bulk inventory updates with transaction safety

CREATE app/api/products/import/route.ts:
  - PATTERN: File upload API with multer integration
  - POST: Process CSV file upload with validation
  - Support streaming for large files
  - Return job ID for progress tracking

CREATE app/api/products/export/route.ts:
  - PATTERN: Dynamic CSV generation and download
  - GET: Generate CSV with filtering and streaming response
  - Include all product and variant data
  - Support different export formats (products only, full catalog)

CREATE app/api/inventory/alerts/route.ts:
  - PATTERN: Stock alert management API
  - GET: List active alerts with filtering
  - POST: Create manual alert or update thresholds
  - PUT: Acknowledge or resolve alerts

Task 5: Enhance Redux Store
UPDATE store/apps/eCommerce/ECommerceSlice.tsx:
  - EXTEND existing slice with inventory state management
  - ADD actions: fetchProductsWithInventory, updateInventory, processImport
  - INCLUDE loading states for import/export operations
  - ADD error handling for inventory operations

ADD new state properties:
  - inventory: { alerts: [], reservations: [], logs: [] }
  - import: { jobs: [], progress: null, errors: [] }
  - filters: { category: '', brand: '', stockStatus: '', priceRange: [] }

Task 6: Enhance Product List Components
UPDATE components/apps/ecommerce/ProductTableList/ProductTableList.tsx:
  - EXTEND existing table with inventory columns (stock, reserved, available)
  - ADD bulk operations toolbar (export, bulk edit, bulk inventory update)
  - INCLUDE advanced filtering (category, brand, stock status)
  - ADD inventory status indicators (in stock, low stock, out of stock)
  - IMPLEMENT real-time updates for inventory changes

ADD new table columns:
  - SKU column with copy-to-clipboard functionality
  - Stock status with color-coded indicators
  - Last updated timestamp
  - Variant count for variable products

Task 7: Enhance Product Add/Edit Components
UPDATE components/apps/ecommerce/productAdd/GeneralCard.tsx:
  - EXTEND with SKU field (auto-generated with manual override)
  - ADD product type selection (simple/variable)
  - INCLUDE category selection with multi-level support
  - ADD SEO fields (meta title, description, slug)

ENHANCE components/apps/ecommerce/productAdd/VariationCard.tsx:
  - IMPROVE variant management with dynamic attribute addition
  - ADD pricing per variant with bulk pricing tools
  - INCLUDE inventory tracking per variant
  - IMPLEMENT variant image management

CREATE components/apps/ecommerce/productAdd/InventoryCard.tsx:
  - PATTERN: New card following existing card structure
  - Include stock quantity, low stock threshold settings
  - Add inventory tracking toggle and backorder settings
  - Implement manual adjustment form with reason

Task 8: Create Inventory Management Components
CREATE components/apps/ecommerce/inventory/InventoryDashboard.tsx:
  - PATTERN: Dashboard widget layout from existing dashboards
  - Include stock overview cards (total products, low stock, out of stock)
  - ADD recent inventory changes table
  - INCLUDE stock value calculations and trends

CREATE components/apps/ecommerce/inventory/StockAlerts.tsx:
  - PATTERN: Alert list component with Material-UI styling
  - Include alert priority indicators and timestamps
  - ADD bulk acknowledgment and resolution actions
  - IMPLEMENT alert filtering and search

CREATE components/apps/ecommerce/inventory/BulkUpdate.tsx:
  - PATTERN: Modal form component with validation
  - Include CSV upload for bulk inventory updates
  - ADD progress tracking with real-time feedback
  - IMPLEMENT error reporting and retry mechanisms

Task 9: Create CSV Import/Export Components
CREATE components/apps/ecommerce/import-export/CSVImport.tsx:
  - PATTERN: File upload component with Material-UI styling
  - Include drag-and-drop upload with file validation
  - ADD template download and field mapping interface
  - IMPLEMENT progress tracking with detailed feedback

CREATE components/apps/ecommerce/import-export/CSVExport.tsx:
  - PATTERN: Export configuration form with options
  - Include filter selection and export format options
  - ADD preview functionality and download preparation
  - IMPLEMENT progress tracking for large exports

CREATE components/apps/ecommerce/import-export/ImportProgress.tsx:
  - PATTERN: Progress tracking component with real-time updates
  - Include success/error statistics and detailed logs
  - ADD error download functionality for failed rows
  - IMPLEMENT retry mechanisms for failed imports

Task 10: Create Enhanced Pages
UPDATE app/(DashboardLayout)/apps/ecommerce/list/page.tsx:
  - ENHANCE with inventory management features
  - ADD quick inventory adjustment modal
  - INCLUDE bulk operations (export, bulk edit)
  - IMPLEMENT advanced filtering and search

CREATE app/(DashboardLayout)/apps/ecommerce/inventory/page.tsx:
  - PATTERN: Follow existing page structure with breadcrumbs
  - Include InventoryDashboard and StockAlerts components
  - ADD quick navigation to low stock products
  - IMPLEMENT real-time inventory updates

CREATE app/(DashboardLayout)/apps/ecommerce/import/page.tsx:
  - PATTERN: Import interface with step-by-step wizard
  - Include CSVImport component and progress tracking
  - ADD import history and job status monitoring
  - IMPLEMENT error handling and retry functionality

CREATE app/(DashboardLayout)/apps/ecommerce/export/page.tsx:
  - PATTERN: Export configuration interface
  - Include CSVExport component with filter options
  - ADD export history and download management
  - IMPLEMENT scheduled export functionality

Task 11: Add Navigation Integration
UPDATE app/(DashboardLayout)/layout/vertical/sidebar/MenuItems.ts:
  - ADD inventory management menu items
  - INCLUDE import/export menu options
  - FOLLOW existing menu structure and icon patterns
  - IMPLEMENT role-based menu visibility

Task 12: Implement Real-time Features
CREATE lib/utils/realtime-inventory.ts:
  - PATTERN: MongoDB Change Streams integration
  - Implement real-time stock updates for frontend
  - ADD WebSocket or Server-Sent Events for live updates
  - INCLUDE connection management and error handling

Task 13: Add Validation and Testing
CREATE utils/validation-schemas.ts:
  - PATTERN: Yup validation schemas for all forms
  - Include product validation, variant validation, CSV validation
  - ADD custom validators for SKU uniqueness and inventory rules
  - IMPLEMENT comprehensive error messages

CREATE __tests__/product-management.test.ts:
  - PATTERN: Follow existing test structure in __tests__/
  - Include unit tests for API routes and utilities
  - ADD integration tests for CSV import/export
  - IMPLEMENT inventory tracking accuracy tests
```

### Per Task Pseudocode Examples

```typescript
// Task 1: Product Model Implementation
import mongoose, { Document, Schema } from 'mongoose';

interface IProduct extends Document {
  productId: string;
  name: string;
  type: 'simple' | 'variable';
  hasVariants: boolean;
  // ... other fields
}

const productSchema = new Schema<IProduct>({
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: ['simple', 'variable', 'grouped', 'external'],
    default: 'simple'
  },
  // PATTERN: Follow User.ts validation and indexing patterns
  inventory: {
    trackQuantity: { type: Boolean, default: true },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    backordersAllowed: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  // PATTERN: Follow User.ts toJSON transformation
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// CRITICAL: Indexes for performance
productSchema.index({ productId: 1 });
productSchema.index({ 'inventory.quantity': 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1 });

// Task 3: SKU Generator Utility
export class SKUGenerator {
  private static generateNumericSuffix(): string {
    return Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
  }
  
  static async generateSKU(product: IProduct, variant?: IProductVariant): Promise<string> {
    // PATTERN: Configurable SKU format with collision detection
    const prefix = product.category?.[0]?.substring(0, 3).toUpperCase() || 'PRD';
    const productPart = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (variant) {
      // Include variant attributes in SKU
      const variantPart = variant.attributes
        .map(attr => attr.value.substring(0, 2).toUpperCase())
        .join('');
      const baseSKU = `${prefix}-${productPart}-${variantPart}-${this.generateNumericSuffix()}`;
      
      // CRITICAL: Check for uniqueness
      const exists = await ProductVariant.findOne({ sku: baseSKU });
      return exists ? this.generateSKU(product, variant) : baseSKU;
    }
    
    const baseSKU = `${prefix}-${productPart}-${this.generateNumericSuffix()}`;
    const exists = await Product.findOne({ 'inventory.sku': baseSKU });
    return exists ? this.generateSKU(product) : baseSKU;
  }
}

// Task 4: Product API Implementation
export async function POST(request: NextRequest) {
  try {
    // PATTERN: Follow login/route.ts structure for validation and error handling
    const body = await request.json();
    
    // Validate request body
    const productSchema = yup.object({
      name: yup.string().required('Product name is required').max(200),
      type: yup.string().oneOf(['simple', 'variable']).default('simple'),
      category: yup.array().of(yup.string()).required(),
      variants: yup.array().when('type', {
        is: 'variable',
        then: yup.array().min(1, 'Variable products must have at least one variant'),
        otherwise: yup.array().optional()
      })
    });
    
    const validatedData = await productSchema.validate(body);
    
    // Connect to database
    await connectToDatabase();
    
    // Start transaction for product + variants
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Create product
        const product = new Product({
          ...validatedData,
          productId: await generateProductId(),
          createdBy: getUserFromToken(request) // Get from JWT
        });
        
        if (validatedData.type === 'simple') {
          // Generate SKU for simple product
          product.inventory.sku = await SKUGenerator.generateSKU(product);
        }
        
        await product.save({ session });
        
        // Create variants if variable product
        if (validatedData.type === 'variable' && validatedData.variants?.length) {
          for (const variantData of validatedData.variants) {
            const variant = new ProductVariant({
              productId: product._id,
              ...variantData,
              sku: await SKUGenerator.generateSKU(product, variantData)
            });
            await variant.save({ session });
          }
        }
        
        // Log initial inventory
        await InventoryLog.create([{
          productId: product._id,
          sku: product.inventory?.sku || 'N/A',
          type: 'adjustment',
          quantityBefore: 0,
          quantityChange: product.inventory?.quantity || 0,
          quantityAfter: product.inventory?.quantity || 0,
          userId: getUserFromToken(request),
          reason: 'Initial product creation',
          source: 'manual'
        }], { session });
      });
      
      return NextResponse.json({
        success: true,
        message: 'Product created successfully'
      }, { status: 201 });
      
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
    
  } catch (error) {
    // PATTERN: Follow existing error handling patterns
    console.error('Product creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create product'
    }, { status: 500 });
  }
}

// Task 7: CSV Import Processing
import Papa from 'papaparse';
import { Readable } from 'stream';

export class CSVProcessor {
  static async processProductImport(
    fileBuffer: Buffer, 
    userId: ObjectId,
    jobId: ObjectId
  ): Promise<ImportResults> {
    
    // PATTERN: Streaming CSV processing for large files
    const results = {
      totalRows: 0,
      processed: 0,
      created: 0,
      updated: 0,
      errors: []
    };
    
    return new Promise((resolve, reject) => {
      const stream = Readable.from(fileBuffer.toString());
      
      Papa.parse(stream, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        step: async (row, parser) => {
          try {
            results.totalRows++;
            
            // Validate row data
            const validatedProduct = await productImportSchema.validate(row.data);
            
            // Check if product exists (by SKU or name)
            const existingProduct = await Product.findOne({
              $or: [
                { 'inventory.sku': validatedProduct.sku },
                { name: validatedProduct.name }
              ]
            });
            
            if (existingProduct) {
              // Update existing product
              await this.updateProductFromCSV(existingProduct, validatedProduct, userId);
              results.updated++;
            } else {
              // Create new product
              await this.createProductFromCSV(validatedProduct, userId);
              results.created++;
            }
            
            results.processed++;
            
            // Update job progress
            await ImportJob.findByIdAndUpdate(jobId, {
              'progress.processedRows': results.processed,
              'progress.successfulRows': results.created + results.updated
            });
            
          } catch (error) {
            results.errors.push({
              row: results.totalRows,
              message: error.message
            });
            
            // GOTCHA: Don't fail entire import for single row errors
            console.error(`CSV import row ${results.totalRows} error:`, error);
          }
        },
        complete: () => {
          resolve(results);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }
}

// Task 8: Inventory Dashboard Component
const InventoryDashboard: React.FC = () => {
  // PATTERN: Follow existing dashboard component structure
  const dispatch = useAppDispatch();
  const { inventory, loading } = useAppSelector(state => state.ecommerceReducer);
  
  const [alerts, setAlerts] = React.useState<StockAlert[]>([]);
  const [inventoryStats, setInventoryStats] = React.useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });
  
  React.useEffect(() => {
    // Fetch inventory data
    dispatch(fetchInventoryStats());
    dispatch(fetchStockAlerts());
    
    // PATTERN: Set up real-time updates with cleanup
    const eventSource = new EventSource('/api/inventory/events');
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'stock_change') {
        // Update local state with real-time inventory changes
        dispatch(updateInventoryFromRealtime(update.data));
      }
    };
    
    return () => {
      eventSource.close();
    };
  }, [dispatch]);
  
  return (
    <PageContainer title="Inventory Dashboard">
      <Breadcrumb title="Inventory Management" items={breadcrumbItems} />
      
      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={3}>
          <BlankCard>
            <CardContent>
              <Typography variant="h4">{inventoryStats.totalProducts}</Typography>
              <Typography color="textSecondary">Total Products</Typography>
            </CardContent>
          </BlankCard>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <BlankCard>
            <CardContent sx={{ backgroundColor: 'warning.light' }}>
              <Typography variant="h4">{inventoryStats.lowStock}</Typography>
              <Typography color="textSecondary">Low Stock Items</Typography>
            </CardContent>
          </BlankCard>
        </Grid>
        
        {/* Stock Alerts Table */}
        <Grid item xs={12}>
          <BlankCard>
            <CardHeader title="Recent Stock Alerts" />
            <StockAlerts alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
          </BlankCard>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

// Task 12: Real-time Inventory Updates
export class RealtimeInventoryManager {
  private static changeStream: ChangeStream;
  
  static initializeChangeStream() {
    // PATTERN: MongoDB Change Streams for real-time updates
    this.changeStream = Product.watch([
      {
        $match: {
          $or: [
            { 'fullDocument.inventory.quantity': { $exists: true } },
            { 'updateDescription.updatedFields.inventory.quantity': { $exists: true } }
          ]
        }
      }
    ]);
    
    this.changeStream.on('change', async (change) => {
      if (change.operationType === 'update') {
        const productId = change.documentKey._id;
        const updatedFields = change.updateDescription?.updatedFields;
        
        if (updatedFields?.['inventory.quantity'] !== undefined) {
          const newQuantity = updatedFields['inventory.quantity'];
          const product = await Product.findById(productId);
          
          // Check for low stock alert
          if (product && newQuantity <= product.inventory.lowStockThreshold) {
            await this.createStockAlert(product, newQuantity);
          }
          
          // Broadcast to connected clients
          await this.broadcastInventoryUpdate({
            productId,
            newQuantity,
            timestamp: new Date()
          });
        }
      }
    });
  }
  
  private static async createStockAlert(product: IProduct, currentStock: number) {
    // PATTERN: Create alert with deduplication
    const existingAlert = await StockAlert.findOne({
      productId: product._id,
      alertType: currentStock === 0 ? 'out_of_stock' : 'low_stock',
      status: 'active'
    });
    
    if (!existingAlert) {
      await StockAlert.create({
        productId: product._id,
        sku: product.inventory?.sku || 'N/A',
        alertType: currentStock === 0 ? 'out_of_stock' : 'low_stock',
        threshold: product.inventory.lowStockThreshold,
        currentStock,
        status: 'active'
      });
    }
  }
}
```

### Integration Points

```yaml
ENVIRONMENT_VARIABLES:
  - add to: .env.example
  - vars: |
      # Enhanced MongoDB Configuration
      MONGODB_URI=mongodb://localhost:27017/boami
      
      # File Upload Configuration
      MAX_FILE_SIZE=10485760  # 10MB
      UPLOAD_DIR=uploads/temp
      
      # CSV Processing
      MAX_CSV_ROWS=10000
      CSV_BATCH_SIZE=100
      
      # Inventory Alerts
      LOW_STOCK_CHECK_INTERVAL=300000  # 5 minutes
      ALERT_EMAIL_COOLDOWN=3600000     # 1 hour

DEPENDENCIES:
  - Add to package.json:
    - papaparse: "^5.4.1"
    - @types/papaparse: "^5.3.14" (dev)
    - multer: "^1.4.5-lts.1"
    - @types/multer: "^1.4.11" (dev)
    - yup: "^1.4.0" (already exists)
    - mongodb: "^6.3.0" (for Change Streams)

NAVIGATION:
  - update: app/(DashboardLayout)/layout/vertical/sidebar/MenuItems.ts
  - pattern: |
      {
        id: uniqueId(),
        title: 'Products',
        icon: IconShoppingCart,
        href: '/apps/ecommerce/list',
        children: [
          {
            id: uniqueId(),
            title: 'Product List',
            icon: IconPoint,
            href: '/apps/ecommerce/list',
          },
          {
            id: uniqueId(),
            title: 'Add Product',
            icon: IconPoint,
            href: '/apps/ecommerce/add-product',
          },
          {
            id: uniqueId(),
            title: 'Inventory',
            icon: IconPoint,
            href: '/apps/ecommerce/inventory',
          },
          {
            id: uniqueId(),
            title: 'Import Products',
            icon: IconPoint,
            href: '/apps/ecommerce/import',
          },
          {
            id: uniqueId(),
            title: 'Export Products',
            icon: IconPoint,
            href: '/apps/ecommerce/export',
          },
        ],
      },

DATABASE_INDEXES:
  - Products collection:
    - { productId: 1 } (unique)
    - { 'inventory.sku': 1 } (unique, sparse)
    - { status: 1, createdAt: -1 }
    - { category: 1, status: 1 }
    - { 'inventory.quantity': 1 }
    - { type: 1, hasVariants: 1 }
  - ProductVariants collection:
    - { productId: 1, attributes: 1 }
    - { sku: 1 } (unique)
    - { 'inventory.quantity': 1 }
    - { productId: 1, isDefault: -1 }
  - InventoryLogs collection:
    - { sku: 1, createdAt: -1 }
    - { productId: 1, createdAt: -1 }
    - { type: 1, createdAt: -1 }
  - StockAlerts collection:
    - { productId: 1, status: 1 }
    - { alertType: 1, status: 1 }
    - { createdAt: -1 }
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                       # ESLint checking
npx tsc --noEmit                   # TypeScript compilation check
npm run build                      # Next.js build verification

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests for Product Management
```typescript
// __tests__/product-management.test.ts
describe('Product Management API', () => {
  beforeEach(async () => {
    await connectToDatabase();
    // Clear test data
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});
  });

  test('Creates simple product with inventory', async () => {
    const productData = {
      name: 'Test Widget',
      type: 'simple',
      category: ['electronics'],
      inventory: {
        trackQuantity: true,
        quantity: 100,
        lowStockThreshold: 10
      }
    };
    
    const response = await request(app)
      .post('/api/products')
      .send(productData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    
    const product = await Product.findOne({ name: 'Test Widget' });
    expect(product).toBeTruthy();
    expect(product.inventory.sku).toBeTruthy();
    expect(product.inventory.quantity).toBe(100);
  });
  
  test('Creates variable product with variants and SKUs', async () => {
    const productData = {
      name: 'Test T-Shirt',
      type: 'variable',
      category: ['clothing'],
      variants: [
        {
          attributes: [
            { name: 'Color', value: 'Red' },
            { name: 'Size', value: 'Large' }
          ],
          pricing: { price: 29.99, currency: 'USD' },
          inventory: { quantity: 50, lowStockThreshold: 5 }
        },
        {
          attributes: [
            { name: 'Color', value: 'Blue' },
            { name: 'Size', value: 'Large' }
          ],
          pricing: { price: 29.99, currency: 'USD' },
          inventory: { quantity: 30, lowStockThreshold: 5 }
        }
      ]
    };
    
    const response = await request(app)
      .post('/api/products')
      .send(productData)
      .expect(201);
    
    const variants = await ProductVariant.find({ productId: response.body.productId });
    expect(variants).toHaveLength(2);
    expect(variants[0].sku).toBeTruthy();
    expect(variants[1].sku).toBeTruthy();
    expect(variants[0].sku).not.toBe(variants[1].sku);
  });
  
  test('Prevents overselling with inventory reservations', async () => {
    const product = await Product.create({
      name: 'Limited Stock Item',
      type: 'simple',
      inventory: { quantity: 5, trackQuantity: true }
    });
    
    // Try to reserve more than available
    const response = await request(app)
      .post(`/api/products/${product._id}/inventory`)
      .send({ action: 'reserve', quantity: 10 })
      .expect(400);
    
    expect(response.body.error).toContain('insufficient stock');
  });
});

// __tests__/csv-import.test.ts  
describe('CSV Import/Export', () => {
  test('Imports products from valid CSV', async () => {
    const csvData = `name,sku,price,category,quantity
Widget A,WID-001,29.99,electronics,100
Widget B,WID-002,39.99,electronics,75`;
    
    const response = await request(app)
      .post('/api/products/import')
      .attach('csvFile', Buffer.from(csvData), 'products.csv')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.results.created).toBe(2);
    
    const products = await Product.find({ name: { $in: ['Widget A', 'Widget B'] } });
    expect(products).toHaveLength(2);
  });
  
  test('Handles CSV validation errors', async () => {
    const csvData = `name,sku,price,category,quantity
,WID-001,29.99,electronics,100
Widget B,,39.99,electronics,75`;
    
    const response = await request(app)
      .post('/api/products/import')
      .attach('csvFile', Buffer.from(csvData), 'products.csv')
      .expect(200);
    
    expect(response.body.results.created).toBe(0);
    expect(response.body.errors).toHaveLength(2);
    expect(response.body.errors[0].message).toContain('name is required');
  });
  
  test('Exports products to CSV format', async () => {
    await Product.create([
      { name: 'Product 1', inventory: { sku: 'P001', quantity: 50 } },
      { name: 'Product 2', inventory: { sku: 'P002', quantity: 25 } }
    ]);
    
    const response = await request(app)
      .get('/api/products/export')
      .expect(200);
    
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('Product 1');
    expect(response.text).toContain('P001');
  });
});

// __tests__/inventory-tracking.test.ts
describe('Inventory Tracking', () => {
  test('Creates low stock alert when threshold reached', async () => {
    const product = await Product.create({
      name: 'Low Stock Product',
      inventory: { 
        quantity: 10, 
        lowStockThreshold: 15,
        trackQuantity: true 
      }
    });
    
    // Simulate stock reduction
    await request(app)
      .post(`/api/products/${product._id}/inventory`)
      .send({ action: 'adjust', quantity: -5, reason: 'Test adjustment' })
      .expect(200);
    
    const alert = await StockAlert.findOne({ productId: product._id });
    expect(alert).toBeTruthy();
    expect(alert.alertType).toBe('low_stock');
    expect(alert.currentStock).toBe(5);
  });
  
  test('Logs all inventory changes', async () => {
    const product = await Product.create({
      name: 'Tracked Product',
      inventory: { quantity: 100, trackQuantity: true }
    });
    
    await request(app)
      .post(`/api/products/${product._id}/inventory`)
      .send({ action: 'adjust', quantity: -10, reason: 'Damaged goods' })
      .expect(200);
    
    const log = await InventoryLog.findOne({ productId: product._id });
    expect(log).toBeTruthy();
    expect(log.type).toBe('adjustment');
    expect(log.quantityChange).toBe(-10);
    expect(log.reason).toBe('Damaged goods');
  });
});
```

```bash
# Run tests iteratively until passing:
npm test -- --testPathPattern=product-management
npm test -- --testPathPattern=csv-import
npm test -- --testPathPattern=inventory-tracking
# If failing: Debug specific test, fix code, re-run
```

### Level 3: Integration Testing
```bash
# Test product API endpoints
curl -X POST "http://localhost:3000/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product", "type": "simple", "category": ["electronics"]}'
# Expected: {"success": true, "productId": "..."}

# Test product listing with filters
curl -X GET "http://localhost:3000/api/products?category=electronics&stockStatus=low" \
  -H "Content-Type: application/json"
# Expected: {"products": [...], "pagination": {...}}

# Test CSV import
curl -X POST "http://localhost:3000/api/products/import" \
  -F "csvFile=@products.csv"
# Expected: {"success": true, "jobId": "...", "results": {...}}

# Test inventory adjustment
curl -X POST "http://localhost:3000/api/products/PRODUCT_ID/inventory" \
  -H "Content-Type: application/json" \
  -d '{"action": "adjust", "quantity": -5, "reason": "Damaged goods"}'
# Expected: {"success": true, "newQuantity": 95}

# Test inventory alerts
curl -X GET "http://localhost:3000/api/inventory/alerts" \
  -H "Content-Type: application/json"
# Expected: {"alerts": [...], "total": 3}

# Test CSV export  
curl -X GET "http://localhost:3000/api/products/export?format=csv" \
  -H "Accept: text/csv"
# Expected: CSV file download with product data
```

### Level 4: Manual UI Testing Checklist
```bash
# Start development server
npm run dev

# Test Product Management:
# 1. Navigate to /apps/ecommerce/list
# 2. Verify enhanced product table with inventory columns
# 3. Create new simple product with inventory tracking
# 4. Create variable product with multiple variants
# 5. Test SKU generation (auto and manual override)
# 6. Verify inventory adjustments and logging

# Test CSV Import/Export:
# 1. Navigate to /apps/ecommerce/import
# 2. Upload sample CSV file with products
# 3. Verify progress tracking and error reporting
# 4. Check imported products in product list
# 5. Navigate to /apps/ecommerce/export
# 6. Generate CSV export with filters
# 7. Verify downloaded file contains correct data

# Test Inventory Management:
# 1. Navigate to /apps/ecommerce/inventory
# 2. Verify inventory dashboard with statistics
# 3. Check stock alerts for low inventory items
# 4. Test bulk inventory updates
# 5. Verify real-time updates when stock changes

# Test Product Variants:
# 1. Create product with multiple variants (size, color)
# 2. Verify each variant gets unique SKU
# 3. Test variant-specific pricing and inventory
# 4. Check variant display in product list

# Test Search and Filtering:
# 1. Search products by name, SKU, category
# 2. Filter by stock status (in stock, low stock, out of stock)
# 3. Filter by category and brand
# 4. Test sorting by various columns

# Test Error Handling:
# 1. Try creating product with duplicate SKU
# 2. Upload invalid CSV file
# 3. Try negative inventory adjustment beyond available stock
# 4. Test network error scenarios
```

## Final Validation Checklist
- [ ] All unit tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] Product CRUD operations working with variants and inventory
- [ ] SKU generation automatic and manual override functional
- [ ] CSV import/export handling large files without memory issues
- [ ] Inventory tracking with real-time updates and reservations
- [ ] Low stock alerts triggering and notification system working
- [ ] Bulk operations (import, export, inventory updates) completed
- [ ] Material-UI interface responsive and following design patterns
- [ ] Database indexes improving query performance
- [ ] Error handling covering all edge cases and file upload scenarios
- [ ] Real-time inventory updates working with Change Streams
- [ ] Transaction safety preventing inventory inconsistencies
- [ ] CSV validation providing detailed error reporting
- [ ] Component integration following existing patterns
- [ ] Navigation integration with proper menu structure

---

## Anti-Patterns to Avoid
- ❌ Don't mix inventory transactions with product master data - use separate collections
- ❌ Don't process large CSV files synchronously - use streaming and background jobs
- ❌ Don't skip inventory reservations - implement proper overselling prevention
- ❌ Don't ignore CSV validation - validate before database operations
- ❌ Don't create inconsistent UI patterns - follow existing Material-UI component structure
- ❌ Don't skip proper indexing - MongoDB queries will be slow without proper indexes
- ❌ Don't forget to handle file upload security - validate file types and sizes
- ❌ Don't skip transaction safety for inventory operations - use MongoDB transactions
- ❌ Don't ignore real-time updates - implement Change Streams for live inventory tracking
- ❌ Don't hardcode SKU patterns - make them configurable for different product types
- ❌ Don't skip progress tracking for long operations - provide user feedback
- ❌ Don't forget error cleanup - remove failed uploads and partial data

## Confidence Score: 9/10

High confidence due to:
- ✅ Comprehensive existing e-commerce foundation with clear patterns to follow
- ✅ Well-documented libraries (PapaParse, MongoDB Change Streams) with TypeScript support
- ✅ Proven MongoDB schema patterns for e-commerce from industry examples
- ✅ Existing Material-UI component patterns and Redux store structure
- ✅ Complete validation gates covering API routes, CSV processing, and inventory tracking
- ✅ Real-world inventory management patterns preventing common e-commerce pitfalls
- ✅ Comprehensive error handling and edge case coverage

Minor uncertainty around:
- File upload size limits for production environments
- Specific CSV format variations from different e-commerce platforms
- Real-time update performance with large product catalogs

The comprehensive context, existing patterns, and proven libraries provide high confidence for successful one-pass implementation.