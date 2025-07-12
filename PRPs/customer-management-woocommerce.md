name: "Customer Management with WooCommerce Integration"
description: |

## Purpose
Implement a comprehensive customer management system with WooCommerce REST API integration, following Boami's existing patterns to enable customer relationship management, segmentation, and order history tracking.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Build a complete customer management system that syncs customer data from WooCommerce stores, provides customer segmentation capabilities, and enables customer relationship management through a Material-UI interface consistent with Boami's existing design patterns.

## Why
- **Business value**: Customer management is fundamental to e-commerce success and customer retention
- **Integration**: Provides foundation for analytics, marketing automation, and AI-powered insights
- **Problems solved**: Centralizes customer data from WooCommerce, enables targeted marketing, improves customer service

## What
A comprehensive customer management module that displays customer profiles, order history, contact details, and provides segmentation tools. The system will sync data from WooCommerce stores in real-time and provide internal notes/tagging capabilities.

### Success Criteria
- [ ] Display customer list with search and filtering capabilities
- [ ] Show detailed customer profiles with complete order history
- [ ] Sync customer data from WooCommerce via REST API
- [ ] Enable customer segmentation (frequent buyers, inactive, etc.)
- [ ] Allow internal notes and tags for customer management
- [ ] Handle WooCommerce webhook updates in real-time
- [ ] Provide responsive Material-UI interface consistent with existing design

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://woocommerce.github.io/woocommerce-rest-api-docs/#customers
  why: Official WooCommerce customer API endpoints and data structures
  
- url: https://woocommerce.com/document/woocommerce-rest-api/
  why: Authentication methods and best practices for WooCommerce API
  
- url: https://github.com/woocommerce/wc-api-node
  why: Official Node.js WooCommerce API library with TypeScript support
  
- file: src/app/(DashboardLayout)/apps/ecommerce/list/page.tsx
  why: Existing pattern for list pages with breadcrumbs and layout
  
- file: src/store/apps/eCommerce/ECommerceSlice.tsx
  why: Redux patterns for async data fetching and state management
  
- file: src/app/(DashboardLayout)/types/apps/eCommerce.ts
  why: TypeScript interface patterns used in the codebase
  
- file: src/app/api/eCommerce/ProductsData.ts
  why: Mock API pattern and axios mock setup used in existing code

- url: https://docs.mongodb.com/manual/data-modeling/
  why: MongoDB schema design best practices for customer and order data
  
- url: https://stripe.com/docs/webhooks
  why: Webhook handling patterns (similar to WooCommerce webhooks)
```

### Current Codebase tree
```bash
src/
├── app/
│   ├── (DashboardLayout)/
│   │   ├── apps/
│   │   │   └── ecommerce/          # Existing e-commerce module
│   │   │       ├── list/page.tsx   # Product list pattern
│   │   │       ├── shop/page.tsx   # Shop interface
│   │   │       └── checkout/page.tsx
│   │   └── types/apps/
│   │       └── eCommerce.ts        # Existing type definitions
│   └── api/
│       └── eCommerce/
│           └── ProductsData.ts     # Mock API pattern
├── components/
│   └── apps/
│       └── ecommerce/              # E-commerce components
├── store/
│   └── apps/
│       └── eCommerce/
│           └── ECommerceSlice.tsx  # Redux patterns
└── utils/
    ├── axios.js                    # HTTP client setup
    └── theme/                      # Material-UI theme
```

### Desired Codebase tree with files to be added
```bash
src/
├── app/
│   ├── (DashboardLayout)/
│   │   ├── apps/
│   │   │   ├── customers/          # NEW: Customer management module
│   │   │   │   ├── list/page.tsx   # Customer list view
│   │   │   │   ├── detail/[id]/page.tsx  # Customer detail view
│   │   │   │   └── segments/page.tsx     # Customer segmentation
│   │   │   └── ecommerce/          # Existing e-commerce module
│   │   └── types/apps/
│   │       ├── customers.ts        # NEW: Customer type definitions
│   │       └── eCommerce.ts        # Existing types
│   └── api/
│       ├── customers/              # NEW: Customer API routes
│       │   ├── route.ts           # Main customer CRUD operations
│       │   ├── sync/route.ts      # WooCommerce sync endpoint
│       │   └── webhooks/route.ts  # WooCommerce webhook handler
│       ├── woocommerce/           # NEW: WooCommerce integration
│       │   ├── client.ts          # WooCommerce API client setup
│       │   └── types.ts           # WooCommerce API type definitions
│       └── eCommerce/             # Existing API
├── components/
│   └── apps/
│       ├── customers/             # NEW: Customer components
│       │   ├── CustomerList.tsx   # Customer list table
│       │   ├── CustomerDetail.tsx # Customer detail view
│       │   ├── CustomerForm.tsx   # Customer form component
│       │   └── CustomerSegments.tsx # Segmentation interface
│       └── ecommerce/             # Existing components
├── store/
│   └── apps/
│       ├── customers/             # NEW: Customer Redux slice
│       │   └── CustomerSlice.tsx
│       └── eCommerce/             # Existing slice
├── lib/                           # NEW: Database and utilities
│   ├── mongodb.ts                 # MongoDB connection
│   ├── models/                    # Mongoose models
│   │   ├── Customer.ts
│   │   └── Order.ts
│   └── woocommerce/              # WooCommerce utilities
│       ├── auth.ts               # Authentication helpers
│       └── sync.ts               # Data synchronization logic
└── utils/                        # Existing utilities
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: WooCommerce REST API authentication differs for HTTP vs HTTPS
// HTTP requires OAuth 1.0a, HTTPS can use Basic Auth with consumer key/secret
// CRITICAL: WooCommerce API rate limits: 25 requests per minute per consumer key
// CRITICAL: MongoDB embedding vs referencing - customers should be separate collection
// CRITICAL: Next.js API routes require explicit HTTP method handling
// CRITICAL: Material-UI v5 uses emotion styling - follow existing sx prop patterns
// CRITICAL: Redux Toolkit requires immer-safe state updates
// CRITICAL: WooCommerce webhook signature verification required for security
// CRITICAL: Customer data may contain PII - implement proper data protection
```

## Implementation Blueprint

### Data models and structure

```typescript
// Customer and Order models for type safety and database schema
interface WooCommerceCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  date_created: string;
  date_modified: string;
  avatar_url: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  is_paying_customer: boolean;
  orders_count: number;
  total_spent: string;
}

interface CustomerSegment {
  id: string;
  name: string;
  criteria: {
    orders_count?: { min?: number; max?: number };
    total_spent?: { min?: number; max?: number };
    last_order_date?: { days_ago?: number };
    created_date?: { days_ago?: number };
  };
  customer_count: number;
}
```

### List of tasks to be completed in order

```yaml
Task 1: Setup MongoDB Models and Database Connection
CREATE lib/mongodb.ts:
  - PATTERN: Use singleton pattern for connection like Next.js examples
  - Handle connection errors and retries
  - Use connection pooling for performance

CREATE lib/models/Customer.ts:
  - PATTERN: Mongoose schema following MongoDB e-commerce best practices
  - Include WooCommerce ID mapping for sync
  - Add internal fields (notes, tags, segments)

CREATE lib/models/Order.ts:
  - PATTERN: Separate collection for orders with customer reference
  - Include WooCommerce order data structure
  - Enable efficient customer history queries

Task 2: Implement WooCommerce API Integration
CREATE lib/woocommerce/auth.ts:
  - PATTERN: OAuth 1.0a for HTTP, Basic Auth for HTTPS
  - Secure credential management using environment variables
  - Rate limiting and error handling

CREATE lib/woocommerce/client.ts:
  - PATTERN: Use official @woocommerce/woocommerce-rest-api library
  - Implement retry logic for API failures
  - Type-safe wrapper functions for customer endpoints

CREATE api/woocommerce/types.ts:
  - PATTERN: TypeScript interfaces matching WooCommerce API responses
  - Transform functions between WooCommerce and internal types

Task 3: Create Customer API Routes
CREATE api/customers/route.ts:
  - PATTERN: Next.js 14 App Router API patterns with named exports
  - GET: List customers with pagination and filtering
  - POST: Create new customer
  - PUT: Update customer
  - DELETE: Soft delete customer

CREATE api/customers/sync/route.ts:
  - PATTERN: Background job pattern for data synchronization
  - Fetch customers from WooCommerce API
  - Upsert customers in MongoDB
  - Handle large datasets with pagination

CREATE api/customers/webhooks/route.ts:
  - PATTERN: Webhook handler with signature verification
  - Handle customer.created, customer.updated, customer.deleted events
  - Update local customer data in real-time

Task 4: Implement Customer Redux Store
CREATE store/apps/customers/CustomerSlice.tsx:
  - PATTERN: Follow existing ECommerceSlice.tsx structure
  - Actions: fetchCustomers, searchCustomers, filterCustomers
  - Async thunks for API calls with error handling
  - State management for loading, pagination, filters

Task 5: Create Customer TypeScript Definitions
CREATE app/(DashboardLayout)/types/apps/customers.ts:
  - PATTERN: Follow existing eCommerce.ts interface patterns
  - Customer, Order, CustomerFilter, CustomerSegment types
  - Props interfaces for components

Task 6: Build Customer List Components
CREATE components/apps/customers/CustomerList.tsx:
  - PATTERN: Follow existing ProductTableList structure
  - Material-UI DataGrid or Table with pagination
  - Search and filter functionality
  - Actions for view/edit/delete

CREATE app/(DashboardLayout)/apps/customers/list/page.tsx:
  - PATTERN: Follow ecommerce/list/page.tsx structure
  - PageContainer + Breadcrumb + BlankCard layout
  - Integration with Redux store

Task 7: Build Customer Detail Components
CREATE components/apps/customers/CustomerDetail.tsx:
  - PATTERN: Material-UI Card layout with tabs for different sections
  - Customer info, order history, notes sections
  - Order history table with sorting and filtering

CREATE app/(DashboardLayout)/apps/customers/detail/[id]/page.tsx:
  - PATTERN: Dynamic routing with customer ID parameter
  - Fetch customer data and order history
  - Handle loading and error states

Task 8: Implement Customer Segmentation
CREATE components/apps/customers/CustomerSegments.tsx:
  - PATTERN: Material-UI interface for creating and managing segments
  - Criteria builder for orders_count, total_spent, date ranges
  - Real-time customer count updates

CREATE app/(DashboardLayout)/apps/customers/segments/page.tsx:
  - PATTERN: List view with segment cards showing criteria and counts
  - Actions to create, edit, delete segments

Task 9: Add Navigation and Integration
MODIFY app/(DashboardLayout)/layout/vertical/navbar/Menudata.ts:
  - Add customer management menu items
  - Follow existing menu structure and icons

UPDATE environment variables:
  - Add WooCommerce API credentials
  - MongoDB connection string
  - Webhook secret keys
```

### Per task pseudocode

```typescript
// Task 2: WooCommerce API Client
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

class WooCommerceClient {
  private client: WooCommerceRestApi;
  
  constructor() {
    // PATTERN: Initialize with environment variables
    this.client = new WooCommerceRestApi({
      url: process.env.WOOCOMMERCE_URL!,
      consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY!,
      consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET!,
      version: 'wc/v3'
    });
  }
  
  async getCustomers(page: number = 1, perPage: number = 100) {
    // GOTCHA: WooCommerce API rate limits - implement backoff
    try {
      const response = await this.client.get('customers', {
        page,
        per_page: perPage,
        orderby: 'date',
        order: 'desc'
      });
      
      // PATTERN: Type-safe response handling
      return response.data as WooCommerceCustomer[];
    } catch (error) {
      // CRITICAL: Handle rate limiting and connection errors
      throw new WooCommerceAPIError('Failed to fetch customers', error);
    }
  }
}

// Task 4: Customer Redux Slice
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params: CustomerListParams) => {
    // PATTERN: Follow existing fetchProducts pattern
    const response = await axios.get('/api/customers', { params });
    return response.data;
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    customers: [],
    loading: false,
    error: null,
    filters: { segment: 'All', search: '' },
    pagination: { page: 1, total: 0, perPage: 50 }
  },
  reducers: {
    // PATTERN: Similar to ECommerceSlice reducers
    setSearch: (state, action) => {
      state.filters.search = action.payload;
    },
    setSegmentFilter: (state, action) => {
      state.filters.segment = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Handle async thunk states
  }
});

// Task 6: Customer List Component
const CustomerList = () => {
  // PATTERN: Follow existing ecommerce component patterns
  const dispatch = useAppDispatch();
  const { customers, loading, filters } = useAppSelector(state => state.customers);
  
  const columns: GridColDef[] = [
    // PATTERN: Material-UI DataGrid columns like existing tables
    { field: 'name', headerName: 'Customer Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'orders_count', headerName: 'Orders', width: 100 },
    { field: 'total_spent', headerName: 'Total Spent', width: 150 },
    { field: 'last_order', headerName: 'Last Order', width: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        // PATTERN: Action buttons for view/edit like existing components
        <IconButton onClick={() => handleViewCustomer(params.row.id)}>
          <VisibilityIcon />
        </IconButton>
      )
    }
  ];
  
  return (
    <DataGrid
      rows={customers}
      columns={columns}
      loading={loading}
      // PATTERN: Pagination and filtering like existing tables
    />
  );
};
```

### Integration Points
```yaml
ENVIRONMENT:
  - add to: .env.local
  - vars: |
      # WooCommerce Integration
      WOOCOMMERCE_URL=https://your-store.com
      WOOCOMMERCE_CONSUMER_KEY=ck_...
      WOOCOMMERCE_CONSUMER_SECRET=cs_...
      WOOCOMMERCE_WEBHOOK_SECRET=wh_...
      
      # MongoDB
      MONGODB_URI=mongodb://localhost:27017/boami
      
NAVIGATION:
  - update: app/(DashboardLayout)/layout/vertical/navbar/Menudata.ts
  - pattern: Add customers section with list, segments, analytics menu items
  
DEPENDENCIES:
  - Add to package.json:
    - @woocommerce/woocommerce-rest-api
    - mongoose
    - @types/mongoose (dev dependency)

DATABASE:
  - MongoDB collections: customers, orders, customer_segments
  - Indexes: email (unique), woocommerce_id, created_at, last_order_date
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                       # ESLint checking
npm run type-check                 # TypeScript compilation
npm run build                      # Next.js build verification

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```typescript
// test_customer_api.test.ts
describe('Customer API', () => {
  test('GET /api/customers returns paginated list', async () => {
    const response = await request(app).get('/api/customers?page=1&limit=10');
    expect(response.status).toBe(200);
    expect(response.body.customers).toHaveLength(10);
    expect(response.body.pagination).toBeDefined();
  });

  test('POST /api/customers/sync syncs from WooCommerce', async () => {
    // Mock WooCommerce API response
    jest.mock('@woocommerce/woocommerce-rest-api');
    
    const response = await request(app).post('/api/customers/sync');
    expect(response.status).toBe(200);
    expect(response.body.synced_count).toBeGreaterThan(0);
  });

  test('Webhook handler verifies signature', async () => {
    const invalidSignature = 'invalid_signature';
    const response = await request(app)
      .post('/api/customers/webhooks')
      .set('X-WC-Webhook-Signature', invalidSignature)
      .send({ id: 123, email: 'test@example.com' });
    
    expect(response.status).toBe(401);
  });
});

// test_customer_components.test.tsx
describe('CustomerList Component', () => {
  test('renders customer table with data', () => {
    const mockCustomers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', orders_count: 5 }
    ];
    
    render(<CustomerList customers={mockCustomers} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('handles search functionality', () => {
    // Test search input and filtering
  });
});
```

```bash
# Run tests iteratively until passing:
npm test -- --testPathPattern=customers
# If failing: Debug specific test, fix code, re-run
```

### Level 3: Integration Test
```bash
# Test WooCommerce API connectivity
curl -X GET "http://localhost:3000/api/customers/sync" \
  -H "Content-Type: application/json"

# Expected: {"synced_count": 50, "status": "success"}

# Test customer list endpoint
curl -X GET "http://localhost:3000/api/customers?page=1&limit=10" \
  -H "Content-Type: application/json"

# Expected: {"customers": [...], "pagination": {...}}

# Test webhook endpoint (simulate WooCommerce)
curl -X POST "http://localhost:3000/api/customers/webhooks" \
  -H "Content-Type: application/json" \
  -H "X-WC-Webhook-Signature: sha256=..." \
  -d '{"id": 123, "email": "customer@example.com"}'

# Expected: {"status": "processed"}
```

### Level 4: Manual UI Testing
```bash
# Start development server
npm run dev

# Navigate to customer management:
# 1. Go to http://localhost:3000/apps/customers/list
# 2. Verify customer list loads with pagination
# 3. Test search functionality
# 4. Click on customer to view detail page
# 5. Verify order history displays correctly
# 6. Test customer segmentation page

# Check WooCommerce sync:
# 1. Trigger sync from UI or API
# 2. Verify new customers appear in list
# 3. Check that existing customers are updated
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] WooCommerce API connectivity works
- [ ] Customer data syncs correctly from WooCommerce
- [ ] Customer list displays with search and pagination
- [ ] Customer detail pages show order history
- [ ] Webhook processing works for real-time updates
- [ ] Customer segmentation functionality works
- [ ] Material-UI styling matches existing design
- [ ] Database indexes improve query performance
- [ ] Error handling covers edge cases
- [ ] Environment variables documented in .env.example

---

## Anti-Patterns to Avoid
- ❌ Don't store WooCommerce credentials in code - use environment variables
- ❌ Don't ignore API rate limits - implement proper backoff strategies  
- ❌ Don't embed all order data in customer documents - use references
- ❌ Don't skip webhook signature verification - security requirement
- ❌ Don't hardcode pagination limits - make them configurable
- ❌ Don't forget to handle WooCommerce API downtime gracefully
- ❌ Don't skip proper error boundaries in React components
- ❌ Don't ignore customer data privacy requirements (GDPR considerations)

## Confidence Score: 9/10

High confidence due to:
- Clear existing patterns in the Boami codebase to follow
- Well-documented WooCommerce REST API with official libraries
- Proven MongoDB schema patterns for e-commerce applications
- Comprehensive validation gates and testing strategy
- Strong TypeScript integration throughout the stack

Minor uncertainty around specific WooCommerce webhook payload variations, but official documentation provides comprehensive coverage.