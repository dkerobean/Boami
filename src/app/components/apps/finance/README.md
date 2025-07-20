# Finance Module

This module provides comprehensive financial management capabilities for the application, including income tracking, expense management, sales recording, and financial reporting.

## Features

### 📊 Dashboard
- **Financial Overview**: Real-time summary of income, expenses, and profit
- **Interactive Charts**: Visual representation of financial trends
- **Key Metrics**: Profit margins, average sales, and growth indicators
- **Recent Transactions**: Quick view of latest financial activities
- **Alerts & Notifications**: Upcoming payments and low stock warnings

### 💰 Income Management
- **Income Recording**: Track all sources of income with categorization
- **Category Management**: Organize income by custom or default categories
- **Date Range Filtering**: View income by specific time periods
- **Recurring Income**: Automatic processing of recurring income streams
- **Sales Integration**: Automatic income creation from sales transactions

### 💸 Expense Management
- **Expense Tracking**: Record and categorize all business expenses
- **Vendor Management**: Associate expenses with specific vendors
- **Receipt Management**: Track expense details and notes
- **Category Organization**: Organize expenses by type and purpose
- **Recurring Expenses**: Automate regular expense entries

### 🛒 Sales Management
- **Product Sales**: Record sales with automatic inventory updates
- **Real-time Stock Validation**: Prevent overselling with live inventory checks
- **Revenue Tracking**: Monitor sales performance and trends
- **Product Performance**: Analyze best-selling products
- **Automatic Income Creation**: Sales automatically generate income records

### 🏷️ Category Management
- **Dual Categories**: Separate management for income and expense categories
- **Default Categories**: Pre-configured categories for common transactions
- **Custom Categories**: Create categories specific to your business
- **Usage Tracking**: Monitor category usage and popularity
- **Bulk Operations**: Manage multiple categories efficiently

### 🏢 Vendor Management
- **Vendor Directory**: Comprehensive contact management for suppliers
- **Contact Information**: Store emails, phones, addresses, and websites
- **Expense Tracking**: Monitor spending per vendor
- **Relationship Management**: Track vendor performance and history
- **Integration**: Seamless integration with expense management

### 🔄 Recurring Payments
- **Automated Processing**: Automatic creation of recurring transactions
- **Flexible Scheduling**: Daily, weekly, monthly, quarterly, or yearly frequencies
- **End Date Management**: Optional expiration dates for recurring payments
- **Status Control**: Enable/disable recurring payments as needed
- **Due Date Tracking**: Monitor upcoming recurring payments

## Technical Architecture

### Component Structure
```
finance/
├── dashboard/           # Financial dashboard and summary components
│   ├── FinanceDashboard.tsx
│   ├── FinancialSummaryCard.tsx
│   └── FinancialChart.tsx
├── income/             # Income management components
│   ├── IncomeForm.tsx
│   ├── IncomeList.tsx
│   └── index.ts
├── expense/            # Expense management components
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   └── index.ts
├── sales/              # Sales management components
│   ├── SaleForm.tsx
│   ├── SalesList.tsx
│   └── index.ts
├── categories/         # Category management components
│   ├── CategoryForm.tsx
│   ├── CategoryManagement.tsx
│   └── index.ts
├── vendors/            # Vendor management components
│   ├── VendorForm.tsx
│   ├── VendorList.tsx
│   └── index.ts
└── recurring/          # Recurring payment components
    ├── RecurringPaymentForm.tsx
    ├── RecurringPaymentList.tsx
    └── index.ts
```

### Services Integration
The finance module integrates with several business logic services:

- **InventoryService**: Stock validation and management
- **RecurringPaymentProcessor**: Automated payment processing
- **FinancialCalculator**: Financial calculations and reporting
- **DateUtility**: Date handling and formatting

### API Integration
All components are designed to work with RESTful APIs:

- `GET/POST/PUT/DELETE /api/finance/income`
- `GET/POST/PUT/DELETE /api/finance/expenses`
- `GET/POST/PUT/DELETE /api/finance/sales`
- `GET/POST /api/finance/categories/{income|expense}`
- `GET/POST/PUT/DELETE /api/finance/vendors`
- `GET/POST/PUT/DELETE /api/finance/recurring`

## Usage Examples

### Basic Income Recording
```tsx
import { IncomeForm } from '@/app/components/apps/finance/income';

<IncomeForm
  onSuccess={() => console.log('Income saved')}
  onCancel={() => console.log('Cancelled')}
/>
```

### Dashboard Integration
```tsx
import { FinanceDashboard } from '@/app/components/apps/finance/dashboard';

<FinanceDashboard />
```

### Custom Financial Summary
```tsx
import { FinancialSummaryCard } from '@/app/components/apps/finance/dashboard';

<FinancialSummaryCard
  title="Monthly Revenue"
  amount={15000}
  previousAmount={12000}
  icon={<IconCash />}
  color="success"
/>
```

## Routing Structure

The finance module uses the following route structure:

- `/apps/finance/dashboard` - Financial overview and dashboard
- `/apps/finance/income` - Income management
- `/apps/finance/expenses` - Expense management
- `/apps/finance/sales` - Sales management
- `/apps/finance/categories` - Category management
- `/apps/finance/vendors` - Vendor management
- `/apps/finance/recurring` - Recurring payment management

## Testing

The module includes comprehensive testing:

- **Unit Tests**: Individual component testing
- **Integration Tests**: API integration testing
- **Route Tests**: Navigation and routing verification
- **Form Tests**: Validation and submission testing

Run tests with:
```bash
npm test src/__tests__/components/finance/
npm test src/__tests__/pages/finance-routing.test.tsx
```

## Configuration

### Environment Variables
The module respects the following environment variables:

- `NEXT_PUBLIC_API_URL`: Base URL for API calls
- `NEXT_PUBLIC_CURRENCY`: Default currency (defaults to USD)

### Theme Integration
All components use Material-UI theming and support:

- Light/Dark mode switching
- Custom color schemes
- Responsive breakpoints
- Accessibility features

## Performance Considerations

- **Lazy Loading**: Components are loaded on-demand
- **Memoization**: Expensive calculations are memoized
- **Virtual Scrolling**: Large lists use virtual scrolling
- **Optimistic Updates**: UI updates immediately with rollback on errors
- **Caching**: API responses are cached where appropriate

## Security Features

- **Input Validation**: All forms include client and server-side validation
- **Authentication**: All routes require authentication
- **Authorization**: User-specific data isolation
- **Sanitization**: All user inputs are sanitized
- **Rate Limiting**: API calls are rate-limited

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When contributing to the finance module:

1. Follow the existing component structure
2. Include comprehensive tests
3. Update documentation
4. Follow TypeScript best practices
5. Ensure accessibility compliance
6. Test across supported browsers

## License

This module is part of the larger application and follows the same licensing terms.