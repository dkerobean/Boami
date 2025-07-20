import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IncomeForm from '@/app/components/apps/finance/income/IncomeForm';

// Mock fetch
global.fetch = jest.fn();

// Mock date picker
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange, slotProps }: any) => (
    <input
      data-testid="date-picker"
      type="date"
      value={value ? value.toISOString().split('T')[0] : ''}
      onChange={(e) => onChange(new Date(e.target.value))}
      aria-label={label}
    />
  ),
}));

jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: jest.fn(),
}));

const mockCategories = [
  { _id: 'cat1', name: 'Product Sales', isDefault: true },
  { _id: 'cat2', name: 'Service Fees', isDefault: true },
];

const mockIncome = {
  _id: '1',
  amount: 1000,
  description: 'Test Income',
  date: '2024-01-01T00:00:00.000Z',
  categoryId: {
    _id: 'cat1',
    name: 'Product Sales',
    isDefault: true,
  },
  isRecurring: false,
};

describe('IncomeForm Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    mockOnSuccess.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders form fields correctly', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<IncomeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    expect(screen.getByLabelText(/income category/i)).toBeInTheDocument();
  });

  it('populates form with existing income data when editing', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(
      <IncomeForm
        income={mockIncome}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Test Income')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<IncomeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Add Income')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Add Income');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });

    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
  });

  it('validates amount field correctly', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<IncomeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    const amountInput = screen.getByLabelText(/amount/i);

    // Test negative amount
    fireEvent.change(amountInput, { target: { value: '-100' } });
    fireEvent.click(screen.getByText('Add Income'));

    await waitFor(() => {
      expect(screen.getByText('Amount must be a positive number')).toBeInTheDocument();
    });

    // Test excessive amount
    fireEvent.change(amountInput, { target: { value: '9999999' } });
    fireEvent.click(screen.getByText('Add Income'));

    await waitFor(() => {
      expect(screen.getByText('Amount cannot exceed $999,999.99')).toBeInTheDocument();
    });
  });

  it('validates description length', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<IncomeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    const descriptionInput = screen.getByLabelText(/description/i);

    // Test short description
    fireEvent.change(descriptionInput, { target: { value: 'ab' } });
    fireEvent.click(screen.getByText('Add Income'));

    await waitFor(() => {
      expect(screen.getByText('Description must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<IncomeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test income entry' } });

    // Select category
    const categorySelect = screen.getByLabelText(/income category/i);
    fireEvent.mouseDown(categorySelect);
    fireEvent.click(screen.getByText('Product Sales'));

    // Submit form
    fireEvent.click(screen.getByText('Add Income'));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<IncomeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Server error' } }),
      });

    render(<IncomeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test income' } });

    const categorySelect = screen.getByLabelText(/income category/i);
    fireEvent.mouseDown(categorySelect);
    fireEvent.click(screen.getByText('Product Sales'));

    fireEvent.click(screen.getByText('Add Income'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});