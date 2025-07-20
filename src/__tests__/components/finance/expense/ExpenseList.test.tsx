import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExpenseList from '@/app/components/apps/finance/expense/ExpenseList';

// Mock the ExpenseForm component
jest.mock('@/app/components/apps/finance/expense/ExpenseForm', () => {
  return function MockExpenseForm({ onSuccess, onCancel }: any) {
    return (
      <div data-testid="expense-form">
        <button onClick={onSuccess}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock expense data
const mockExpenses = [
  {
    _id: '1',
    amount: 250.00,
    description: 'Office supplies purchase',
    date: '2023-07-15T00:00:00.000Z',
    categoryId: 'cat1',
    category: { name: 'Office Supplies', isDefault: true },
    vendorId: 'vendor1',
    vendor: { name: 'Office Depot', email: 'orders@officedepot.com' },
    isRecurring: false,
    createdAt: '2023-07-15T10:30:00.000Z'
  },
  {
    _id: '2',
    amount: 1200.00,
    description: 'Monthly rent payment',
    date: '2023-07-01T00:00:00.000Z',
    categoryId: 'cat2',
    category: { name: 'Rent', isDefault: true },
    vendorId: 'vendor2',
    vendor: { name: 'Property Management Co', email: 'rent@propmanage.com' },
    isRecurring: true,
    createdAt: '2023-07-01T09:00:00.000Z'
  },
];

const mockApiResponse = {
  expenses: mockExpenses,
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    pages: 1
  },
  summary: {
    totalAmount: 1450.00,
    count: 2
  }
};

describe('ExpenseList', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse)
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders expense list with data', async () => {
    render(<ExpenseList />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Office supplies purchase')).toBeInTheDocument();
      expect(screen.getByText('Monthly rent payment')).toBeInTheDocument();
    });

    // Check if summary is displayed
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('$1,450.00')).toBeInTheDocument();
    expect(screen.getByText('2 expense records')).toBeInTheDocument();
  });

  it('displays expense details correctly', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByText('Office supplies purchase')).toBeInTheDocument();
    });

    // Check expense details
    expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    expect(screen.getByText('Office Depot')).toBeInTheDocument();
    expect(screen.getByText('orders@officedepot.com')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('One-time')).toBeInTheDocument();

    // Check recurring expense
    expect(screen.getByText('Recurring')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search expenses...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search expenses...');
    fireEvent.change(searchInput, { target: { value: 'office' } });

    // The search should trigger a new API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + search
    });
  });

  it('handles date range filtering', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
    });

    // Open date range dropdown
    fireEvent.mouseDown(screen.getByLabelText('Date Range'));

    await waitFor(() => {
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });

    // Select "This Month"
    fireEvent.click(screen.getByText('This Month'));

    // Should trigger a new API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + filter
    });
  });

  it('opens add expense dialog', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    });
  });

  it('opens edit expense dialog', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByText('Office supplies purchase')).toBeInTheDocument();
    });

    // Find and click edit button for first expense
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Expense')).toBeInTheDocument();
      expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    });
  });

  it('handles delete expense', async () => {
    // Mock delete API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response);

    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByText('Office supplies purchase')).toBeInTheDocument();
    });

    // Find and click delete button for first expense
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    // Confirm delete in dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    // Should call delete API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/expenses/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('handles pagination', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByText('Rows per page:')).toBeInTheDocument();
    });

    // Change rows per page
    const rowsPerPageSelect = screen.getByDisplayValue('10');
    fireEvent.mouseDown(rowsPerPageSelect);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('25'));

    // Should trigger a new API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + pagination change
    });
  });

  it('handles sorting', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    // Click on Amount column header to sort
    fireEvent.click(screen.getByText('Amount'));

    // Should trigger a new API call with sorting
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + sort
    });
  });

  it('shows loading state', () => {
    // Mock pending API response
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<ExpenseList />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when no expenses', async () => {
    // Mock empty response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        expenses: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        summary: { totalAmount: 0, count: 0 }
      })
    } as Response);

    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByText('No expenses found')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    // Mock API error
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load expense data/i)).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(<ExpenseList />);

    await waitFor(() => {
      expect(screen.getByTitle('Refresh')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Refresh'));

    // Should trigger a new API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('closes form dialog when form is submitted', async () => {
    render(<ExpenseList />);

    // Open add expense dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    });

    // Submit form
    fireEvent.click(screen.getByText('Save'));

    // Dialog should close and data should reload
    await waitFor(() => {
      expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument();
    });
  });
});