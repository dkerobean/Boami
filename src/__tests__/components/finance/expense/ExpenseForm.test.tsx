import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ExpenseForm from '@/app/components/apps/finance/expense/ExpenseForm';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock data
const mockCategories = [
  { _id: 'cat1', name: 'Office Supplies', isDefault: true },
  { _id: 'cat2', name: 'Travel', isDefault: false },
];

const mockVendors = [
  { _id: 'vendor1', name: 'Office Depot', email: 'orders@officedepot.com' },
  { _id: 'vendor2', name: 'Travel Agency', email: 'bookings@travel.com' },
];

const mockExpense = {
  _id: '1',
  amount: 250.00,
  description: 'Office supplies purchase',
  date: '2023-07-15T00:00:00.000Z',
  categoryId: {
    _id: 'cat1',
    name: 'Office Supplies',
    isDefault: true
  },
  vendorId: {
    _id: 'vendor1',
    name: 'Office Depot',
    email: 'orders@officedepot.com'
  },
  isRecurring: false
};

// Wrapper component with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    {children}
  </LocalizationProvider>
);

describe('ExpenseForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/finance/categories/expense') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: mockCategories })
        } as Response);
      }

      if (url === '/api/finance/vendors') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ vendors: mockVendors })
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders form fields correctly', async () => {
    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Wait for categories and vendors to load
    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expense category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/category is required/i)).toBeInTheDocument();
    });
  });

  it('validates amount field correctly', async () => {
    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    const amountField = screen.getByLabelText(/amount/i);

    // Test negative amount
    fireEvent.change(amountField, { target: { value: '-10' } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByText(/amount must be a positive number/i)).toBeInTheDocument();
    });

    // Test amount too large
    fireEvent.change(amountField, { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByText(/amount cannot exceed/i)).toBeInTheDocument();
    });
  });

  it('validates description field correctly', async () => {
    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    const descriptionField = screen.getByLabelText(/description/i);

    // Test description too short
    fireEvent.change(descriptionField, { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByText(/description must be at least 3 characters/i)).toBeInTheDocument();
    });

    // Test description too long
    const longDescription = 'a'.repeat(256);
    fireEvent.change(descriptionField, { target: { value: longDescription } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByText(/description cannot exceed 255 characters/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByLabelText(/expense category/i)).toBeInTheDocument();
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '100.50' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test expense description' } });

    // Select category
    fireEvent.mouseDown(screen.getByLabelText(/expense category/i));
    await waitFor(() => {
      fireEvent.click(screen.getByText('Office Supplies'));
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100.50,
          description: 'Test expense description',
          date: expect.any(String),
          categoryId: 'cat1',
          vendorId: undefined,
        }),
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('populates form when editing existing expense', async () => {
    render(
      <TestWrapper>
        <ExpenseForm
          expense={mockExpense}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('250')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Office supplies purchase')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update expense/i })).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Server error' }
        })
      } as Response)
    );

    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Wait for form to load and fill it out
    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test expense' } });

    // Select category
    fireEvent.mouseDown(screen.getByLabelText(/expense category/i));
    await waitFor(() => {
      fireEvent.click(screen.getByText('Office Supplies'));
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during form submission', async () => {
    // Mock delayed API response
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response), 100)
      )
    );

    render(
      <TestWrapper>
        <ExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Wait for form to load and fill it out
    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test expense' } });

    // Select category
    fireEvent.mouseDown(screen.getByLabelText(/expense category/i));
    await waitFor(() => {
      fireEvent.click(screen.getByText('Office Supplies'));
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    // Check for loading state
    expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled();
  });
});