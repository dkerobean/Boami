# INITIAL.md

## PROJECT: Boami E-commerce Management Platform

**Boami** is a comprehensive e-commerce management platform built with Next.js 14, TypeScript, and Material-UI. It provides end-to-end business management capabilities including product inventory, order processing, customer relationship management, financial analytics, and AI-powered insights.

## CORE FEATURES:

### 🔹 1. Product & Inventory Management
Manage your products and inventory with full control and visibility.
- **Product Management**: Add or edit products with multiple variants (e.g., size, color), SKU codes, pricing, images, and categories
- **Inventory Tracking**: Automatically monitor stock levels, receive low-stock alerts, and prevent overselling
- **Bulk Upload/Export**: Quickly import or export product data using Excel or CSV—ideal for large catalogs or syncing between platforms

### 🔹 2. Order Management
Streamline the entire order lifecycle from purchase to delivery.
- **Order Dashboard**: View and manage orders across all statuses—new, processing, shipped, completed, cancelled
- **Tracking & Fulfillment**: Assign tracking numbers, generate shipping labels, and mark orders as shipped
- **Printable Documents**: Create and print invoices and packing slips for fulfillment or recordkeeping
- **Automated Updates**: Automatically notify customers via email or SMS when order status changes

### 🔹 3. Customer Management (WooCommerce Integration)
Build better customer relationships and understand their behavior.
- **Customer Profiles**: View detailed order history, contact information, shipping addresses, and account notes
- **Segmentation**: Group customers by behavior (e.g., frequent buyers, one-time customers, inactive users) for targeted marketing
- **Customer Notes**: Add internal comments or tags for special handling
- **WooCommerce Sync**: Automatically fetch customer data and order history from your WooCommerce store

### 🔹 4. Payments & Invoicing
Easily manage finances and ensure professional payment processing.
- **Record Payments**: Log both manual (cash, bank transfer) and online (card, mobile money) payments
- **Invoice Generator**: Automatically create and send branded invoices for each transaction
- **Payment Integration**: Seamlessly connect to payment gateways like Stripe, Paystack, Flutterwave, and more

### 🔹 5. Analytics & Financial Reporting
Get a clear picture of your sales, performance, and financial health.
- **Sales Dashboard**: Visual reports for daily, weekly, and monthly sales with trend comparisons
- **Top Products**: Identify your best sellers and optimize inventory decisions
- **Customer Insights**: Understand customer lifetime value (LTV), order frequency, and retention
- **Income & Expenses**: Track every inflow and outflow with categorized financial reporting (ads, shipping, staff, returns, etc.)
- **Financial Trends**: Analyze income and expense patterns with trend forecasting
- **WooCommerce Integration**: Sync order and customer data for consolidated reporting

### 🔹 6. Smart Notifications
Stay informed and take action automatically.
- **Alerts**: Get real-time alerts for low inventory, high sales spikes, returns, and refund requests
- **Email/SMS Triggers**: Automatically send customers order confirmations, shipping updates, or reminders
- **Scheduled Campaigns**: Launch flash sales or promos at set dates with preconfigured discounts

### 🔹 7. Workflow Automation
Save time and reduce errors with smart automation.
- **Auto Delivery Assignment**: Automatically assign delivery partners based on customer location or shipping zone
- **Order Tagging Rules**: Tag high-value orders or specific product categories for internal workflows
- **Cart Follow-Up**: Detect abandoned carts and trigger follow-up emails or SMS to recover sales

### 🤖 8. AI-Powered Features (Advanced)
Use artificial intelligence to make data-driven decisions and boost revenue.

#### Sales Forecasting
- Predict future inventory needs based on past sales patterns, trends, and seasonality
- Avoid stockouts or overstocking by getting proactive restock suggestions

#### Product Recommendation Engine
- Suggest relevant products to customers during or after checkout based on their browsing and purchase history
- Increase average order value and repeat purchases through AI-driven personalization

### 📦 9. Logistics & Fulfillment
Deliver efficiently and maintain customer satisfaction.

#### Delivery Management
- Assign drivers or dispatch riders automatically
- Track delivery status from pickup to drop-off
- Send customers confirmation messages once their items are delivered

### 🧑‍💼 10. Team & User Management
Allow collaboration and delegation with role-based access.
- **Multi-User Access**: Add staff members with specific roles like Admin, Sales, Fulfillment, Finance, or Support
- **Activity Tracking**: Monitor changes made by each user for accountability and security
- **Mobile Interface for Riders**: Lightweight mobile-first UI for delivery agents to mark deliveries, update statuses, and get routes
- **Authentication System**: Secure login and session management with role-based permissions

## TECHNICAL ARCHITECTURE:

### Tech Stack
- **Framework**: Next.js 14.2.7 with App Router
- **Language**: TypeScript 5.3.3
- **UI Library**: Material-UI v5 with Emotion styling
- **State Management**: Redux Toolkit with Redux Persist
- **Charts**: ApexCharts with react-apexcharts
- **Forms**: Formik with Yup validation
- **Data Tables**: TanStack React Table v8
- **Internationalization**: i18next with react-i18next

### Key Integrations Required
- **WooCommerce API**: For syncing products, orders, and customer data
- **Payment Gateways**: Stripe, Paystack, Flutterwave, PayPal integration
- **Email/SMS Services**: For automated notifications and marketing
- **Shipping APIs**: For tracking number generation and delivery updates
- **Database**: MongoDB for application data storage
- **File Storage**: For product images and document management

### Project Structure
```
src/
├── app/                          # Next.js App Router pages
│   ├── (DashboardLayout)/        # Main dashboard layout
│   │   ├── apps/                 # Core application modules
│   │   │   ├── ecommerce/        # Product & order management
│   │   │   ├── customers/        # Customer management (NEW)
│   │   │   ├── analytics/        # Financial reporting (NEW)
│   │   │   ├── inventory/        # Inventory tracking (NEW)
│   │   │   └── logistics/        # Delivery management (NEW)
│   │   ├── dashboards/           # Analytics dashboards
│   │   └── settings/             # User & system settings
│   ├── api/                      # API routes and integrations
│   │   ├── woocommerce/          # WooCommerce API handlers (NEW)
│   │   ├── payments/             # Payment gateway integrations (NEW)
│   │   ├── notifications/        # Email/SMS services (NEW)
│   │   └── ai/                   # AI-powered features (NEW)
├── components/                   # Reusable UI components
├── store/                        # Redux store configuration
├── utils/                        # Utilities and configurations
└── types/                        # TypeScript definitions
```

## ENVIRONMENT VARIABLES REQUIRED:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# WooCommerce Integration
WOOCOMMERCE_URL=your_woocommerce_store_url
WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret

# Payment Gateways
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key

# Notifications
EMAIL_SERVICE_API_KEY=your_email_service_key
SMS_SERVICE_API_KEY=your_sms_service_key

# AI Services (Optional)
OPENAI_API_KEY=your_openai_key_for_ai_features

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=your_app_url
```

## SETUP INSTRUCTIONS:

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd boami
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in all required API keys and database connections

3. **Database Setup**
   - Set up MongoDB database
   - Run initial migration scripts for user roles and default data

4. **WooCommerce Integration**
   - Install WooCommerce REST API plugin on your WordPress site
   - Generate API keys and add to environment variables
   - Configure webhook endpoints for real-time sync

5. **Payment Gateway Setup**
   - Create accounts with desired payment providers
   - Configure webhook endpoints for payment notifications
   - Add API keys to environment variables

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## DEVELOPMENT COMMANDS:

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## PROJECT GOALS:

1. **Unified Management**: Provide a single platform for managing all aspects of an e-commerce business
2. **Automation**: Reduce manual work through intelligent automation and AI-powered insights
3. **Scalability**: Support businesses from small startups to large enterprises
4. **Integration-First**: Seamlessly connect with existing tools and platforms
5. **Mobile-Ready**: Ensure full functionality on mobile devices for on-the-go management
6. **Data-Driven**: Provide actionable insights through comprehensive analytics and reporting

## FUTURE ENHANCEMENTS:

- **Multi-store Management**: Support for managing multiple WooCommerce stores
- **Advanced AI Features**: Dynamic pricing, demand forecasting, chatbot support
- **Mobile Apps**: Native iOS and Android apps for store managers and delivery personnel
- **API Marketplace**: Allow third-party integrations and custom plugins
- **Advanced Reporting**: Custom report builder and scheduled report generation
- **International Support**: Multi-currency, multi-language, and regional compliance features

## DEVELOPMENT NOTES:

- Follow existing codebase patterns and conventions
- Use TypeScript strictly with proper type definitions
- Implement proper error handling and validation for all API integrations
- Ensure responsive design for all new components
- Add comprehensive testing for critical business logic
- Document all new API endpoints and integration points
- Follow security best practices for handling sensitive data and API keys