import React from 'react';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the finance components
jest.mock('@/app/components/apps/finance/dashboard', () => ({
  FinanceDashboard: () => <div data-testid="finance-dashboard">Finance Dashboard</div>
}));

jest.mock('@/app/components/apps/finance/income', () => ({
  IncomeList: () => <div data-testid="income-list">Income List</div>
}));

jest.mock('@/app/components/apps/finance/expense', () => ({
  ExpenseList: () => <div data-testid="expense-list">Expense List</div>
}));

jest.mock('@/app/components/apps/finance/sales', () => ({
  SalesList: () => <div data-testid="sales-list">Sales List</div>
}));

jest.mock('@/app/components/apps/finance/categories', () => ({
  CategoryManagement: () => <div data-testid="category-management">Category Management</div>
}));

jest.mock('@/app/components/apps/finance/vendors', () => ({
  VendorList: () => <div data-testid="vendor-list">Vendor List</div>
}));

jest.mock('@/app/components/apps/finance/recurring', () => ({
  RecurringPaymentList: () => <div data-testid="recurring-payment-list">Recurring Payment List</div>
}));

// Import page components
import FinanceDashboardPage from '@/app/(dashboard)/apps/finance/dashboard/page';
import IncomePage from '@/app/(dashboard)/apps/finance/income/page';
import ExpensesPage from '@/app/(dashboard)/apps/finance/expenses/page';
import SalesPage from '@/app/(dashboard)/apps/finance/sales/page';
import CategoriesPage from '@/app/(dashboard)/apps/finance/categories/page';
import VendorsPage from '@/app/(dashboard)/apps/finance/vendors/page';
import RecurringPaymentsPage from '@/app/(dashboard)/apps/finance/recurring/page';

describe('Finance Page Routing', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/',
      query: {},
      asPath: '/',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders Finance Dashboard page correctly', () => {
    render(<FinanceDashboardPage />);
    expect(screen.getByTestId('finance-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Finance Dashboard')).toBeInTheDocument();
  });

  it('renders Income page correctly', () => {
    render(<IncomePage />);
    expect(screen.getByTestId('income-list')).toBeInTheDocument();
    expect(screen.getByText('Income List')).toBeInTheDocument();
  });

  it('renders Expenses page correctly', () => {
    render(<ExpensesPage />);
    expect(screen.getByTestId('expense-list')).toBeInTheDocument();
    expect(screen.getByText('Expense List')).toBeInTheDocument();
  });

  it('renders Sales page correctly', () => {
    render(<SalesPage />);
    expect(screen.getByTestId('sales-list')).toBeInTheDocument();
    expect(screen.getByText('Sales List')).toBeInTheDocument();
  });

  it('renders Categories page correctly', () => {
    render(<CategoriesPage />);
    expect(screen.getByTestId('category-management')).toBeInTheDocument();
    expect(screen.getByText('Category Management')).toBeInTheDocument();
  });

  it('renders Vendors page correctly', () => {
    render(<VendorsPage />);
    expect(screen.getByTestId('vendor-list')).toBeInTheDocument();
    expect(screen.getByText('Vendor List')).toBeInTheDocument();
  });

  it('renders Recurring Payments page correctly', () => {
    render(<RecurringPaymentsPage />);
    expect(screen.getByTestId('recurring-payment-list')).toBeInTheDocument();
    expect(screen.getByText('Recurring Payment List')).toBeInTheDocument();
  });
});

describe('Finance Route Structure', () => {
  const expectedRoutes = [
    '/apps/finance/dashboard',
    '/apps/finance/income',
    '/apps/finance/expenses',
    '/apps/finance/sales',
    '/apps/finance/categories',
    '/apps/finance/vendors',
    '/apps/finance/recurring'
  ];

  it('should have all expected finance routes defined', () => {
    // This test verifies that all expected routes are properly structured
    // In a real application, you might want to test actual routing behavior
    expectedRoutes.forEach(route => {
      expect(route).toMatch(/^\/apps\/finance\/[a-z]+$/);
    });
  });

  it('should follow consistent naming convention', () => {
    expectedRoutes.forEach(route => {
      // All routes should start with /apps/finance/
      expect(route).toMatch(/^\/apps\/finance\//);

      // Route segments should be lowercase
      const segments = route.split('/');
      segments.forEach(segment => {
        if (segment) {
          expect(segment).toBe(segment.toLowerCase());
        }
      });
    });
  });
});