name: "Boami E-commerce Management Platform - Complete Implementation"
description: |

## Purpose
Implement a comprehensive e-commerce management platform with 10 major feature areas, following Boami's existing Next.js 14 + TypeScript + Material-UI patterns to enable end-to-end business management from products to AI-powered insights.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Build a complete e-commerce management platform that handles product management, order processing, customer relationships, payment integration, analytics, AI-powered insights, and team management through a unified Material-UI interface consistent with the existing Boami codebase.

## Why
- **Business value**: Provides unified platform for managing all aspects of e-commerce business
- **Integration**: Foundation for WooCommerce sync, payment gateways, and AI-powered automation  
- **Problems solved**: Eliminates need for multiple separate tools, provides real-time insights, automates repetitive tasks

## What
A comprehensive 10-module e-commerce platform including:
1. Product & Inventory Management
2. Order Management  
3. Customer Management (WooCommerce Integration)
4. Payments & Invoicing
5. Analytics & Financial Reporting
6. Smart Notifications
7. Workflow Automation
8. AI-Powered Features
9. Logistics & Fulfillment
10. Team & User Management

### Success Criteria
- [ ] Complete product catalog with inventory tracking and WooCommerce sync
- [ ] Order management system with status tracking and fulfillment
- [ ] Customer profiles with segmentation and order history
- [ ] Multi-gateway payment processing (Stripe, Paystack, Flutterwave)
- [ ] Real-time analytics dashboard with financial reporting
- [ ] AI-powered product recommendations and sales forecasting
- [ ] Automated notifications and workflow triggers
- [ ] Team management with role-based permissions
- [ ] Responsive Material-UI interface matching existing design
- [ ] All features tested and production-ready

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window

# WooCommerce Integration
- url: https://woocommerce.github.io/woocommerce-rest-api-docs/
  why: Official WooCommerce REST API documentation - customers, products, orders endpoints
  
- url: https://developer.woocommerce.com/docs/apis/rest-api/
  why: Authentication methods and webhook setup for real-time sync
  
- url: https://www.npmjs.com/package/@woocommerce/woocommerce-rest-api
  why: Official Node.js library with TypeScript support (v1.0.2, published 2 days ago)

# Payment Gateway Integrations  
- url: https://vercel.com/guides/getting-started-with-nextjs-typescript-stripe
  why: Stripe + Next.js 14 + TypeScript integration best practices for 2025
  
- url: https://dev.to/stripe/type-safe-payments-with-next-js-typescript-and-stripe-4jo7
  why: Type-safe Stripe implementation patterns with webhook handling
  
- url: https://paystack.com/docs/payments/accept-payments/
  why: Paystack API documentation for African market payments
  
- url: https://developer.flutterwave.com/docs/getting-started
  why: Flutterwave integration for multi-currency African payments

# AI Integration & Recommendations
- url: https://www.mongodb.com/developer/products/atlas/ecommerce-search-openai/
  why: MongoDB Vector Search + OpenAI embeddings for product recommendations
  
- url: https://medium.com/@mohantaankit2002/building-ai-powered-recommendation-engines-in-node-js-for-e-commerce-platforms-fa6d6cca87dc
  why: Node.js recommendation engine implementation with OpenAI API

# MongoDB E-commerce Schema Design
- url: https://www.infoq.com/articles/data-model-mongodb/
  why: Sample e-commerce MongoDB data modeling best practices
  
- url: https://www.mongodb.com/blog/post/retail-reference-architecture-part-1-building-flexible-searchable-low-latency-product
  why: MongoDB product catalog architecture for retail

# Existing Codebase Patterns (CRITICAL TO FOLLOW)
- file: src/app/(DashboardLayout)/types/apps/eCommerce.ts
  why: TypeScript interface patterns used in the codebase
  
- file: src/store/apps/eCommerce/ECommerceSlice.tsx
  why: Redux patterns for async data fetching and state management
  
- file: src/lib/database/models/User.ts
  why: Mongoose model patterns with TypeScript interfaces and validation
  
- file: src/app/api/auth/login/route.ts
  why: Next.js 14 App Router API patterns with validation and error handling
  
- file: src/app/(DashboardLayout)/apps/ecommerce/list/page.tsx
  why: Page layout patterns with breadcrumbs and Material-UI components
```

### Current Codebase Architecture
```bash
src/
├── app/
│   ├── (DashboardLayout)/
│   │   ├── apps/
│   │   │   └── ecommerce/              # Basic e-commerce (EXTEND THIS)
│   │   │       ├── list/page.tsx       # Product list pattern to follow
│   │   │       ├── shop/page.tsx       # Shop interface pattern
│   │   │       └── checkout/page.tsx   # Checkout flow pattern
│   │   ├── dashboards/
│   │   │   ├── ecommerce/page.tsx      # Analytics dashboard pattern
│   │   │   └── modern/page.tsx         # Modern dashboard components
│   │   └── types/apps/
│   │       └── eCommerce.ts            # Existing TypeScript patterns
│   └── api/
│       ├── auth/                       # Complete auth system (USE PATTERNS)
│       │   ├── login/route.ts          # API route pattern to follow
│       │   ├── register/route.ts       # Registration pattern
│       │   └── verify-email/route.ts   # Email verification pattern
│       └── eCommerce/
│           └── ProductsData.ts         # Mock API pattern (REPLACE WITH REAL)
├── components/
│   ├── apps/
│   │   └── ecommerce/                  # Basic components (EXTEND)
│   ├── dashboards/
│   │   └── ecommerce/                  # Dashboard widgets (USE PATTERNS)
│   └── shared/                         # Reusable components (FOLLOW PATTERNS)
├── lib/
│   ├── auth/                           # Complete auth system (USE PATTERNS)
│   ├── database/
│   │   ├── models/                     # User model exists (ADD MORE)
│   │   └── mongoose-connection.ts      # Database connection (USE THIS)
│   └── email/                          # Email system (EXTEND FOR NOTIFICATIONS)
├── store/
│   └── apps/
│       ├── eCommerce/                  # Basic Redux slice (EXTEND)
│       └── customizer/                 # Theme management (USE PATTERNS)
└── utils/
    ├── axios.js                        # HTTP client setup
    └── theme/                          # Material-UI theme configuration
```

### Desired Codebase Architecture After Implementation
```bash
src/
├── app/
│   ├── (DashboardLayout)/
│   │   ├── apps/
│   │   │   ├── products/               # NEW: Product & Inventory Management
│   │   │   │   ├── list/page.tsx       # Product catalog
│   │   │   │   ├── add/page.tsx        # Add product form
│   │   │   │   ├── edit/[id]/page.tsx  # Edit product
│   │   │   │   └── inventory/page.tsx  # Inventory tracking
│   │   │   ├── orders/                 # NEW: Order Management
│   │   │   │   ├── list/page.tsx       # Order dashboard
│   │   │   │   ├── detail/[id]/page.tsx # Order details
│   │   │   │   └── fulfillment/page.tsx # Fulfillment center
│   │   │   ├── customers/              # NEW: Customer Management
│   │   │   │   ├── list/page.tsx       # Customer list
│   │   │   │   ├── detail/[id]/page.tsx # Customer profile
│   │   │   │   └── segments/page.tsx   # Customer segmentation
│   │   │   ├── payments/               # NEW: Payment Management
│   │   │   │   ├── dashboard/page.tsx  # Payment overview
│   │   │   │   ├── invoices/page.tsx   # Invoice management
│   │   │   │   └── gateways/page.tsx   # Gateway configuration
│   │   │   ├── analytics/              # NEW: Analytics & Reporting
│   │   │   │   ├── sales/page.tsx      # Sales analytics
│   │   │   │   ├── financial/page.tsx  # Financial reporting
│   │   │   │   └── customers/page.tsx  # Customer analytics
│   │   │   ├── automation/             # NEW: AI & Workflow Automation
│   │   │   │   ├── recommendations/page.tsx # AI recommendations
│   │   │   │   ├── workflows/page.tsx  # Workflow management
│   │   │   │   └── forecasting/page.tsx # Sales forecasting
│   │   │   ├── logistics/              # NEW: Logistics & Fulfillment
│   │   │   │   ├── delivery/page.tsx   # Delivery management
│   │   │   │   ├── tracking/page.tsx   # Shipment tracking
│   │   │   │   └── drivers/page.tsx    # Driver management
│   │   │   ├── team/                   # NEW: Team & User Management
│   │   │   │   ├── users/page.tsx      # User management
│   │   │   │   ├── roles/page.tsx      # Role management
│   │   │   │   └── activity/page.tsx   # Activity tracking
│   │   │   └── ecommerce/              # EXISTING: Basic e-commerce
│   │   └── dashboards/
│   │       ├── ecommerce/page.tsx      # Enhanced main dashboard
│   │       └── analytics/page.tsx      # NEW: Advanced analytics
│   └── api/
│       ├── products/                   # NEW: Product API
│       │   ├── route.ts                # CRUD operations
│       │   ├── sync/route.ts           # WooCommerce sync
│       │   └── inventory/route.ts      # Inventory management
│       ├── orders/                     # NEW: Order API
│       │   ├── route.ts                # Order CRUD
│       │   ├── status/route.ts         # Status updates
│       │   └── fulfillment/route.ts    # Fulfillment operations
│       ├── customers/                  # NEW: Customer API
│       │   ├── route.ts                # Customer CRUD
│       │   ├── sync/route.ts           # WooCommerce sync
│       │   └── segments/route.ts       # Segmentation
│       ├── payments/                   # NEW: Payment API
│       │   ├── stripe/route.ts         # Stripe integration
│       │   ├── paystack/route.ts       # Paystack integration
│       │   ├── flutterwave/route.ts    # Flutterwave integration
│       │   └── webhooks/               # Payment webhooks
│       ├── analytics/                  # NEW: Analytics API
│       │   ├── sales/route.ts          # Sales data
│       │   ├── financial/route.ts      # Financial reports
│       │   └── customers/route.ts      # Customer analytics
│       ├── ai/                         # NEW: AI Services
│       │   ├── recommendations/route.ts # Product recommendations
│       │   ├── forecasting/route.ts    # Sales forecasting
│       │   └── insights/route.ts       # Business insights
│       ├── notifications/              # NEW: Notification system
│       │   ├── email/route.ts          # Email notifications
│       │   ├── sms/route.ts            # SMS notifications
│       │   └── webhooks/route.ts       # Webhook management
│       └── woocommerce/                # NEW: WooCommerce integration
│           ├── client.ts               # API client
│           ├── sync/route.ts           # Data synchronization
│           └── webhooks/route.ts       # WooCommerce webhooks
├── lib/
│   ├── database/
│   │   └── models/                     # NEW: Complete data models
│   │       ├── Product.ts              # Product schema
│   │       ├── Order.ts                # Order schema
│   │       ├── Customer.ts             # Customer schema
│   │       ├── Payment.ts              # Payment schema
│   │       ├── Inventory.ts            # Inventory schema
│   │       ├── Notification.ts         # Notification schema
│   │       └── Workflow.ts             # Workflow schema
│   ├── integrations/                   # NEW: External integrations
│   │   ├── woocommerce/                # WooCommerce client
│   │   ├── payments/                   # Payment gateway clients
│   │   ├── ai/                         # OpenAI integration
│   │   └── notifications/              # Email/SMS services
│   └── utils/                          # NEW: Business logic utilities
│       ├── analytics.ts                # Analytics calculations
│       ├── inventory.ts                # Inventory management
│       └── recommendations.ts          # AI recommendation logic
├── components/
│   └── apps/
│       ├── products/                   # NEW: Product components
│       ├── orders/                     # NEW: Order components
│       ├── customers/                  # NEW: Customer components
│       ├── payments/                   # NEW: Payment components
│       ├── analytics/                  # NEW: Analytics components
│       ├── automation/                 # NEW: AI/Automation components
│       └── logistics/                  # NEW: Logistics components
└── store/
    └── apps/
        ├── products/                   # NEW: Product state management
        ├── orders/                     # NEW: Order state management
        ├── customers/                  # NEW: Customer state management
        ├── payments/                   # NEW: Payment state management
        ├── analytics/                  # NEW: Analytics state management
        └── notifications/              # NEW: Notification state management
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: WooCommerce REST API authentication
// HTTP requires OAuth 1.0a, HTTPS can use Basic Auth with consumer key/secret
// Rate limits: 25 requests per minute per consumer key

// CRITICAL: Payment gateway security
// Never expose secret keys in frontend - always use server-side API routes
// Stripe requires webhook signature verification for security
// Paystack and Flutterwave have specific regional requirements

// CRITICAL: MongoDB schema design
// Use separate collections for products, orders, customers (not embedded)
// Implement proper indexing for performance (email, SKU, order dates)
// Use transactions for inventory updates to prevent overselling

// CRITICAL: Next.js 14 App Router specifics
// API routes require explicit HTTP method handling (GET, POST, PUT, DELETE)
// Use NextRequest/NextResponse for proper type safety
// Environment variables must be prefixed with NEXT_PUBLIC_ for client access

// CRITICAL: Material-UI v5 patterns
// Use emotion styling with sx prop - follow existing component patterns
// Theme customization must follow existing theme structure
// Form components should use existing CustomTextField patterns

// CRITICAL: Redux Toolkit requirements
// State updates must be immer-safe (no direct mutations)
// Async thunks for all API calls with proper error handling
// Follow existing slice patterns for consistency

// CRITICAL: TypeScript strict mode
// All interfaces must match Mongoose schemas exactly
// API responses need proper type definitions
// Component props must have defined interfaces

// CRITICAL: OpenAI API integration
// Use text-embedding-ada-002 model for vector embeddings (1536 dimensions)
// Implement rate limiting to prevent throttling
// Store embeddings in MongoDB for vector search

// CRITICAL: Email/SMS notifications
// Use existing Resend integration patterns
// Implement proper template system for notifications
// Handle unsubscribe and preference management

// CRITICAL: Real-time features
// Use MongoDB change streams for real-time updates
// Implement proper WebSocket connections for live data
// Cache frequently accessed data with Redis if needed
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// Core e-commerce data models with TypeScript interfaces

// Product Schema
interface IProduct {
  _id: ObjectId;
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice?: number;
  costPrice: number;
  category: ObjectId;
  subcategory?: ObjectId;
  brand?: string;
  images: string[];
  variants: {
    name: string; // size, color, etc.
    value: string;
    price?: number;
    sku?: string;
  }[];
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    trackQuantity: boolean;
    backordersAllowed: boolean;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    slug: string;
  };
  woocommerce: {
    id?: number;
    lastSync?: Date;
    syncStatus: 'synced' | 'pending' | 'error';
  };
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Order Schema
interface IOrder {
  _id: ObjectId;
  orderNumber: string;
  customer: ObjectId;
  items: {
    product: ObjectId;
    variant?: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }[];
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    method: string;
    cost: number;
    trackingNumber?: string;
  };
  payment: {
    gateway: 'stripe' | 'paystack' | 'flutterwave' | 'manual';
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    transactionId?: string;
    amount: number;
    currency: string;
    fees?: number;
    paidAt?: Date;
  };
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  timeline: {
    status: string;
    note?: string;
    timestamp: Date;
    user?: ObjectId;
  }[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  notes?: string;
  woocommerce: {
    id?: number;
    lastSync?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Customer Schema
interface ICustomer {
  _id: ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  addresses: {
    type: 'billing' | 'shipping';
    isDefault: boolean;
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }[];
  segments: string[]; // frequent_buyer, vip, inactive, etc.
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    lifetimeValue: number;
  };
  preferences: {
    emailMarketing: boolean;
    smsMarketing: boolean;
    currency: string;
    language: string;
  };
  notes: {
    content: string;
    author: ObjectId;
    createdAt: Date;
  }[];
  tags: string[];
  woocommerce: {
    id?: number;
    lastSync?: Date;
    username?: string;
  };
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Payment Gateway Configuration
interface IPaymentGateway {
  _id: ObjectId;
  name: string;
  provider: 'stripe' | 'paystack' | 'flutterwave';
  isActive: boolean;
  isDefault: boolean;
  configuration: {
    publicKey: string;
    secretKey: string; // encrypted
    webhookSecret: string; // encrypted
    supportedCurrencies: string[];
    supportedCountries: string[];
  };
  settings: {
    captureMethod: 'automatic' | 'manual';
    allowedPaymentMethods: string[];
    minimumAmount?: number;
    maximumAmount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Analytics & Reporting Schema
interface IAnalyticsEvent {
  _id: ObjectId;
  eventType: 'page_view' | 'product_view' | 'add_to_cart' | 'purchase' | 'search';
  userId?: ObjectId;
  sessionId: string;
  productId?: ObjectId;
  orderId?: ObjectId;
  metadata: {
    page?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    value?: number;
    currency?: string;
  };
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
}
```

### List of Tasks to Complete (Phased Implementation)

```yaml
# PHASE 1: Core Infrastructure & Database Setup
Phase1_Task1: Setup Enhanced MongoDB Models
CREATE lib/database/models/Product.ts:
  - PATTERN: Follow User.ts structure with comprehensive schema
  - Include WooCommerce mapping fields for sync
  - Add inventory tracking and variant support
  - Implement proper indexing for performance

CREATE lib/database/models/Order.ts:
  - PATTERN: Complex document with embedded arrays for items
  - Include complete billing/shipping address structure
  - Add payment status tracking and timeline
  - Implement order number generation logic

CREATE lib/database/models/Customer.ts:
  - PATTERN: Customer profile with address array and stats tracking
  - Include segmentation and preference fields
  - Add notes array for customer service
  - Implement WooCommerce ID mapping

Phase1_Task2: Environment Configuration
UPDATE .env.example:
  - Add WooCommerce API credentials
  - Include payment gateway configurations
  - Add OpenAI API key for AI features
  - Add notification service credentials

# PHASE 2: WooCommerce Integration Foundation
Phase2_Task1: WooCommerce API Client Setup
CREATE lib/integrations/woocommerce/client.ts:
  - PATTERN: Use @woocommerce/woocommerce-rest-api package
  - Implement rate limiting and retry logic
  - Add TypeScript wrapper functions
  - Handle authentication for HTTP vs HTTPS

CREATE lib/integrations/woocommerce/sync.ts:
  - PATTERN: Background job pattern for data synchronization
  - Implement pagination for large datasets
  - Add conflict resolution for data conflicts
  - Include sync status tracking

Phase2_Task2: WooCommerce API Routes
CREATE app/api/woocommerce/sync/route.ts:
  - PATTERN: Follow existing auth API route structure
  - Handle products, customers, orders sync
  - Implement webhook signature verification
  - Add proper error handling and logging

# PHASE 3: Product & Inventory Management
Phase3_Task1: Product Management API
CREATE app/api/products/route.ts:
  - PATTERN: Follow Next.js 14 App Router with named exports
  - GET: List products with filtering and pagination
  - POST: Create new product with validation
  - PUT: Update product including inventory
  - DELETE: Soft delete with WooCommerce sync

Phase3_Task2: Product Management UI
CREATE components/apps/products/ProductList.tsx:
  - PATTERN: Follow existing ecommerce component structure
  - Material-UI DataGrid with search/filter
  - Actions for edit/delete/view inventory
  - Bulk operations for multiple products

CREATE app/(DashboardLayout)/apps/products/list/page.tsx:
  - PATTERN: Follow ecommerce/list/page.tsx layout
  - PageContainer + Breadcrumb + BlankCard structure
  - Integration with Redux store
  - Add/Edit product modals

Phase3_Task3: Inventory Tracking System
CREATE lib/utils/inventory.ts:
  - PATTERN: Business logic utility functions
  - Stock level calculations and alerts
  - Reservation system for cart items
  - Automatic reorder point calculations

# PHASE 4: Customer Management System
Phase4_Task1: Customer Redux Store
CREATE store/apps/customers/CustomerSlice.tsx:
  - PATTERN: Follow ECommerceSlice.tsx structure exactly
  - Actions: fetchCustomers, searchCustomers, segmentCustomers
  - Async thunks with proper error handling
  - State management for filters and pagination

Phase4_Task2: Customer Management Components
CREATE components/apps/customers/CustomerList.tsx:
  - PATTERN: Material-UI DataGrid like existing tables
  - Customer segments filter dropdown
  - Search by name, email, phone
  - Quick actions for view/edit/notes

CREATE components/apps/customers/CustomerDetail.tsx:
  - PATTERN: Material-UI Card layout with tabs
  - Customer info, order history, notes sections
  - Segmentation assignment interface
  - Order history table with filters

# PHASE 5: Order Management System
Phase5_Task1: Order Processing API
CREATE app/api/orders/route.ts:
  - PATTERN: RESTful API with comprehensive CRUD
  - Status update workflows with validation
  - Inventory deduction on order creation
  - Email notification triggers

Phase5_Task2: Order Management Dashboard
CREATE components/apps/orders/OrderDashboard.tsx:
  - PATTERN: Dashboard widget layout from existing dashboards
  - Order status overview cards
  - Recent orders table with quick actions
  - Order fulfillment queue

Phase5_Task3: Order Status Workflow
CREATE lib/utils/order-workflow.ts:
  - PATTERN: State machine for order status transitions
  - Automatic email notifications on status change
  - Inventory management integration
  - Payment status synchronization

# PHASE 6: Payment Gateway Integration
Phase6_Task1: Stripe Integration
CREATE app/api/payments/stripe/route.ts:
  - PATTERN: Secure API route with webhook handling
  - Payment intent creation and confirmation
  - Webhook signature verification
  - Proper error handling and logging

CREATE lib/integrations/payments/stripe.ts:
  - PATTERN: TypeScript client wrapper
  - Payment processing utilities
  - Refund and partial refund handling
  - Customer payment method management

Phase6_Task2: Paystack Integration
CREATE app/api/payments/paystack/route.ts:
  - PATTERN: Similar to Stripe but with Paystack specifics
  - Handle Paystack's unique payment flow
  - Support for bank transfer and mobile money
  - Proper webhook verification

Phase6_Task3: Flutterwave Integration
CREATE app/api/payments/flutterwave/route.ts:
  - PATTERN: Multi-currency payment handling
  - Support for African payment methods
  - Currency conversion and fee calculation
  - Cross-border payment compliance

# PHASE 7: Analytics & Reporting Dashboard
Phase7_Task1: Analytics Data Collection
CREATE lib/utils/analytics.ts:
  - PATTERN: Event tracking utility functions
  - Customer behavior analytics
  - Sales performance calculations
  - Revenue and profit analytics

Phase7_Task2: Analytics Dashboard Components
CREATE components/apps/analytics/SalesDashboard.tsx:
  - PATTERN: Follow existing dashboard component structure
  - ApexCharts integration for data visualization
  - Date range filtering and comparison
  - Export functionality for reports

# PHASE 8: AI-Powered Features
Phase8_Task1: OpenAI Integration Setup
CREATE lib/integrations/ai/openai.ts:
  - PATTERN: OpenAI API client with rate limiting
  - Vector embedding generation for products
  - Text analysis for customer segmentation
  - Sales forecasting algorithms

Phase8_Task2: Product Recommendation Engine
CREATE app/api/ai/recommendations/route.ts:
  - PATTERN: MongoDB Vector Search implementation
  - Collaborative filtering algorithms
  - Real-time recommendation generation
  - A/B testing framework for recommendations

Phase8_Task3: Sales Forecasting
CREATE components/apps/automation/SalesForecasting.tsx:
  - PATTERN: Chart-based forecasting dashboard
  - Seasonal trend analysis
  - Inventory planning recommendations
  - Alert system for unusual patterns

# PHASE 9: Notification & Automation System
Phase9_Task1: Email Notification System
CREATE lib/integrations/notifications/email.ts:
  - PATTERN: Extend existing Resend integration
  - Template system for different notification types
  - Personalization and dynamic content
  - Unsubscribe and preference management

Phase9_Task2: Workflow Automation Engine
CREATE lib/utils/automation.ts:
  - PATTERN: Rule-based automation system
  - Trigger conditions and action definitions
  - Customer journey automation
  - Abandoned cart recovery workflows

# PHASE 10: Team Management & Final Integration
Phase10_Task1: Enhanced User Management
MODIFY lib/database/models/User.ts:
  - ADD team management roles and permissions
  - Include department and access level fields
  - Add activity tracking and audit logs
  - Implement role-based access control

Phase10_Task2: Activity Tracking & Audit Logs
CREATE lib/utils/audit.ts:
  - PATTERN: Comprehensive activity logging
  - User action tracking across all modules
  - Data change history for compliance
  - Security event monitoring

Phase10_Task3: Final Integration & Navigation
MODIFY app/(DashboardLayout)/layout/vertical/navbar/Menudata.ts:
  - ADD all new module menu items
  - Implement role-based menu visibility
  - Add proper icons and sub-navigation
  - Follow existing menu structure patterns
```

### Per Task Pseudocode Examples

```typescript
// Phase 2: WooCommerce API Client Implementation
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

class WooCommerceClient {
  private client: WooCommerceRestApi;
  private rateLimiter: Map<string, number> = new Map();
  
  constructor() {
    // PATTERN: Initialize with environment variables
    this.client = new WooCommerceRestApi({
      url: process.env.WOOCOMMERCE_URL!,
      consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY!,
      consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET!,
      version: 'wc/v3',
      queryStringAuth: process.env.WOOCOMMERCE_URL?.startsWith('https') ? false : true
    });
  }
  
  async getProducts(params: WooCommerceProductParams) {
    // GOTCHA: WooCommerce API rate limits - implement backoff
    await this.enforceRateLimit();
    
    try {
      const response = await this.client.get('products', {
        per_page: params.perPage || 100,
        page: params.page || 1,
        status: 'publish',
        orderby: 'date',
        order: 'desc',
        ...params.filters
      });
      
      // PATTERN: Transform WooCommerce data to internal format
      return response.data.map(this.transformProduct);
    } catch (error) {
      // CRITICAL: Handle rate limiting and connection errors
      throw new WooCommerceAPIError('Failed to fetch products', error);
    }
  }
  
  private async enforceRateLimit() {
    // GOTCHA: 25 requests per minute rate limit
    const now = Date.now();
    const lastRequest = this.rateLimiter.get('products') || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < 2400) { // 2.4 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2400 - timeSinceLastRequest));
    }
    
    this.rateLimiter.set('products', Date.now());
  }
}

// Phase 5: Order Management with Inventory Integration
export const createOrder = async (orderData: CreateOrderRequest) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // PATTERN: Validate inventory availability first
      for (const item of orderData.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product || product.inventory.quantity < item.quantity) {
          throw new InsufficientInventoryError(`Not enough stock for ${product?.name}`);
        }
      }
      
      // PATTERN: Create order with pending status
      const order = new Order({
        orderNumber: await generateOrderNumber(),
        customer: orderData.customerId,
        items: orderData.items,
        status: 'pending',
        payment: { status: 'pending' },
        totals: calculateOrderTotals(orderData.items)
      });
      
      await order.save({ session });
      
      // PATTERN: Reserve inventory for order
      for (const item of orderData.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { 'inventory.quantity': -item.quantity } },
          { session }
        );
      }
      
      // PATTERN: Trigger notifications
      await NotificationService.sendOrderConfirmation(order);
      
      return order;
    });
  } catch (error) {
    // CRITICAL: Ensure inventory rollback on failure
    throw error;
  } finally {
    await session.endSession();
  }
};

// Phase 6: Stripe Payment Processing
export const processStripePayment = async (paymentData: StripePaymentRequest) => {
  try {
    // PATTERN: Create payment intent with order metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Convert to cents
      currency: paymentData.currency.toLowerCase(),
      metadata: {
        orderId: paymentData.orderId,
        customerId: paymentData.customerId
      },
      // GOTCHA: Enable automatic payment methods for better conversion
      automatic_payment_methods: { enabled: true }
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    // CRITICAL: Handle Stripe errors with proper error codes
    if (error.type === 'StripeCardError') {
      throw new PaymentDeclinedError(error.message);
    }
    throw new PaymentProcessingError('Payment processing failed');
  }
};

// Phase 7: Analytics Data Processing
export const calculateSalesMetrics = async (dateRange: DateRange) => {
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: dateRange.start,
          $lte: dateRange.end
        },
        status: { $in: ['delivered', 'completed'] }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalRevenue: { $sum: '$totals.total' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$totals.total' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ];
  
  // PATTERN: Use MongoDB aggregation for complex analytics
  return await Order.aggregate(pipeline);
};

// Phase 8: AI Product Recommendations
export const generateProductRecommendations = async (customerId: string) => {
  // PATTERN: Get customer purchase history
  const customerOrders = await Order.find({ customer: customerId })
    .populate('items.product')
    .sort({ createdAt: -1 })
    .limit(10);
  
  // PATTERN: Extract product features for embedding
  const purchasedProducts = customerOrders.flatMap(order => 
    order.items.map(item => ({
      name: item.product.name,
      category: item.product.category,
      description: item.product.description
    }))
  );
  
  // GOTCHA: OpenAI API rate limiting - batch requests
  const productText = purchasedProducts
    .map(p => `${p.name} ${p.category} ${p.description}`)
    .join(' ');
  
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: productText
  });
  
  // PATTERN: Use MongoDB Vector Search for similar products
  const recommendations = await Product.aggregate([
    {
      $vectorSearch: {
        index: 'product_embeddings',
        path: 'embedding',
        queryVector: embedding.data[0].embedding,
        numCandidates: 100,
        limit: 10
      }
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ]);
  
  return recommendations;
};
```

### Integration Points

```yaml
ENVIRONMENT_VARIABLES:
  - add to: .env.example
  - vars: |
      # WooCommerce Integration
      WOOCOMMERCE_URL=https://your-store.com
      WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key
      WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret
      WOOCOMMERCE_WEBHOOK_SECRET=wh_your_webhook_secret
      
      # Payment Gateways
      STRIPE_SECRET_KEY=sk_your_stripe_secret
      STRIPE_PUBLISHABLE_KEY=pk_your_stripe_publishable
      STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
      PAYSTACK_SECRET_KEY=sk_your_paystack_secret
      PAYSTACK_PUBLIC_KEY=pk_your_paystack_public
      FLUTTERWAVE_SECRET_KEY=FLWSECK_your_flutterwave_secret
      FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_your_flutterwave_public
      
      # AI Services
      OPENAI_API_KEY=sk-your_openai_api_key
      OPENAI_ORG_ID=org-your_organization_id
      
      # Notification Services
      EMAIL_SERVICE_API_KEY=your_email_service_key
      SMS_SERVICE_API_KEY=your_sms_service_key
      
      # MongoDB Vector Search
      MONGODB_ATLAS_SEARCH_INDEX=product_embeddings

DEPENDENCIES:
  - Add to package.json:
    - @woocommerce/woocommerce-rest-api: "^1.0.2"
    - stripe: "^13.0.0"
    - paystack: "^2.0.1" 
    - flutterwave-node-v3: "^1.0.11"
    - openai: "^4.24.1"
    - @types/stripe: "^8.0.416" (dev)

NAVIGATION:
  - update: app/(DashboardLayout)/layout/vertical/navbar/Menudata.ts
  - pattern: |
      {
        navlabel: true,
        subheader: 'E-commerce Management',
      },
      {
        id: uniqueId(),
        title: 'Products',
        icon: IconShoppingCart,
        href: '/apps/products/list',
        children: [
          {
            id: uniqueId(),
            title: 'Product List',
            icon: IconPoint,
            href: '/apps/products/list',
          },
          {
            id: uniqueId(),
            title: 'Add Product',
            icon: IconPoint,
            href: '/apps/products/add',
          },
          {
            id: uniqueId(),
            title: 'Inventory',
            icon: IconPoint,
            href: '/apps/products/inventory',
          },
        ],
      },
      // Similar structure for Orders, Customers, Payments, Analytics, etc.

DATABASE_INDEXES:
  - Products collection:
    - { sku: 1 } (unique)
    - { 'woocommerce.id': 1 }
    - { category: 1, status: 1 }
    - { 'inventory.quantity': 1 }
  - Orders collection:
    - { orderNumber: 1 } (unique)
    - { customer: 1, createdAt: -1 }
    - { status: 1, createdAt: -1 }
    - { 'payment.status': 1 }
  - Customers collection:
    - { email: 1 } (unique)
    - { 'woocommerce.id': 1 }
    - { segments: 1 }
    - { 'stats.lastOrderDate': -1 }
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

### Level 2: Unit Tests for Each Module
```typescript
// test/products.test.ts
describe('Product Management', () => {
  test('Creates product with valid data', async () => {
    const productData = {
      sku: 'TEST-001',
      name: 'Test Product',
      price: 99.99,
      inventory: { quantity: 100, trackQuantity: true }
    };
    
    const response = await request(app)
      .post('/api/products')
      .send(productData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.sku).toBe('TEST-001');
  });
  
  test('Handles inventory deduction on order', async () => {
    // Test inventory management logic
  });
  
  test('Syncs with WooCommerce API', async () => {
    // Mock WooCommerce API and test sync
  });
});

// test/orders.test.ts
describe('Order Management', () => {
  test('Processes order with inventory check', async () => {
    // Test order creation with inventory validation
  });
  
  test('Handles payment status updates', async () => {
    // Test payment webhook processing
  });
  
  test('Sends order confirmation email', async () => {
    // Test notification system
  });
});

// test/payments.test.ts
describe('Payment Processing', () => {
  test('Processes Stripe payment successfully', async () => {
    // Mock Stripe API and test payment flow
  });
  
  test('Handles payment failures gracefully', async () => {
    // Test error handling for failed payments
  });
  
  test('Verifies webhook signatures', async () => {
    // Test webhook security
  });
});

// test/ai.test.ts
describe('AI Features', () => {
  test('Generates product recommendations', async () => {
    // Test recommendation engine
  });
  
  test('Creates product embeddings', async () => {
    // Test OpenAI integration
  });
  
  test('Performs sales forecasting', async () => {
    // Test forecasting algorithms
  });
});
```

```bash
# Run tests iteratively until passing:
npm test -- --testPathPattern=products
npm test -- --testPathPattern=orders  
npm test -- --testPathPattern=payments
npm test -- --testPathPattern=ai
# If failing: Debug specific test, fix code, re-run
```

### Level 3: Integration Testing
```bash
# Test WooCommerce API connectivity
curl -X GET "http://localhost:3000/api/woocommerce/sync" \
  -H "Content-Type: application/json"
# Expected: {"synced": {"products": 50, "customers": 25, "orders": 10}}

# Test product API endpoints
curl -X POST "http://localhost:3000/api/products" \
  -H "Content-Type: application/json" \
  -d '{"sku": "TEST-001", "name": "Test Product", "price": 99.99}'
# Expected: {"success": true, "data": {...}}

# Test order processing
curl -X POST "http://localhost:3000/api/orders" \
  -H "Content-Type: application/json" \
  -d '{"customerId": "...", "items": [...]}'
# Expected: {"success": true, "orderId": "...", "status": "pending"}

# Test payment gateway webhook
curl -X POST "http://localhost:3000/api/payments/stripe/webhooks" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: ..." \
  -d '{"type": "payment_intent.succeeded", "data": {...}}'
# Expected: {"received": true}

# Test AI recommendations
curl -X GET "http://localhost:3000/api/ai/recommendations?customerId=..." \
  -H "Content-Type: application/json"
# Expected: {"recommendations": [...], "confidence": 0.85}
```

### Level 4: Manual UI Testing Checklist
```bash
# Start development server
npm run dev

# Test Product Management:
# 1. Navigate to /apps/products/list
# 2. Verify product list loads with search/filter
# 3. Add new product with variants and images
# 4. Test inventory tracking and low stock alerts
# 5. Sync with WooCommerce and verify data consistency

# Test Order Management:
# 1. Navigate to /apps/orders/list
# 2. Create test order and verify inventory deduction
# 3. Update order status and verify email notifications
# 4. Test order fulfillment workflow
# 5. Generate and print invoices

# Test Customer Management:
# 1. Navigate to /apps/customers/list
# 2. View customer details and order history
# 3. Test customer segmentation features
# 4. Add customer notes and tags
# 5. Sync with WooCommerce customer data

# Test Payment Processing:
# 1. Configure payment gateways in admin
# 2. Process test payments with each gateway
# 3. Test webhook handling for payment updates
# 4. Verify payment reporting and reconciliation

# Test Analytics Dashboard:
# 1. Navigate to /apps/analytics/sales
# 2. Verify charts load with real data
# 3. Test date range filtering
# 4. Export sales reports to CSV/PDF
# 5. Check real-time dashboard updates

# Test AI Features:
# 1. Navigate to /apps/automation/recommendations
# 2. Generate product recommendations for customers
# 3. Test sales forecasting with historical data
# 4. Verify recommendation accuracy tracking
```

## Final Validation Checklist
- [ ] All unit tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] WooCommerce API connectivity and sync working
- [ ] All payment gateways configured and processing payments
- [ ] Customer data syncs correctly from WooCommerce
- [ ] Product inventory tracking prevents overselling
- [ ] Order management workflow complete end-to-end
- [ ] Email/SMS notifications working for all triggers
- [ ] Analytics dashboard showing accurate real-time data
- [ ] AI recommendations generating relevant suggestions
- [ ] Sales forecasting producing reasonable predictions
- [ ] Team management and role-based access working
- [ ] All Material-UI components responsive and accessible
- [ ] Database indexes optimizing query performance
- [ ] Error handling covers all edge cases and API failures
- [ ] Security measures prevent data exposure and injection attacks
- [ ] Environment variables documented and .env.example updated
- [ ] API documentation complete for all endpoints
- [ ] User guide and admin documentation complete

---

## Anti-Patterns to Avoid
- ❌ Don't store payment credentials in code - use encrypted environment variables
- ❌ Don't ignore API rate limits - implement proper backoff and queuing
- ❌ Don't embed all related data - use proper MongoDB references and population
- ❌ Don't skip webhook signature verification - critical security requirement
- ❌ Don't hardcode business logic in components - use utility functions
- ❌ Don't forget to handle concurrent inventory updates - use MongoDB transactions
- ❌ Don't skip proper error boundaries in React components
- ❌ Don't ignore customer data privacy (GDPR, CCPA) - implement proper consent management
- ❌ Don't create inconsistent UI patterns - follow existing Material-UI design system
- ❌ Don't skip proper TypeScript typing - maintain strict type safety throughout
- ❌ Don't forget real-time updates - implement WebSocket or Server-Sent Events where needed
- ❌ Don't skip proper testing of payment flows - test with actual gateway sandbox accounts

## Confidence Score: 9/10

High confidence due to:
- ✅ Strong existing Next.js 14 + TypeScript + Material-UI foundation in the codebase
- ✅ Complete authentication system and database patterns already established
- ✅ Well-documented APIs for all major integrations (WooCommerce, Stripe, OpenAI)
- ✅ Proven MongoDB e-commerce schema patterns from industry best practices
- ✅ Comprehensive validation gates and testing strategy for each phase
- ✅ Existing component and Redux patterns to follow throughout implementation
- ✅ Modern payment gateway TypeScript libraries with active maintenance
- ✅ Clear phased implementation approach reducing complexity and risk

Minor uncertainty around:
- Specific OpenAI API rate limits for production usage
- WooCommerce webhook payload variations across different store configurations
- Payment gateway regional compliance requirements for different countries

The comprehensive context, existing patterns, and phased approach provide high confidence for successful one-pass implementation.