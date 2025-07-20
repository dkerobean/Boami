import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import IncomeList from '@/app/components/apps/finance/income/IncomeList'

// Mock the API calls
jest.mock('@/lib/services/api', () => ({
  fetchIncomes: jest.fn(),
  deleteIncome: jest.fn(),
}))

// Mock the hooks
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}))

const mockIncomes = [
  {
    id: '1',
    amount: 5000,
    description: 'Monthly salary',
    date: '2024-01-15',
    category: {
      id: 'cat-1',
      name: 'Salary',
      isDefault: true,
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    amount: 1500,
    description: 'Freelance project',
    date: '2024-01-20',
    category: {
      id: 'cat-2',
      name: 'Freelance',
      isDefault: false,
    },
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
]

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      // Add minimal reducers for testing
      auth: (state = { user: null, isAuthenticated: false }) => state,
    },
  })
}

const renderWithProvider = (component: React.ReactElement) => {
  const store = createMockStore()
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('IncomeList Component', () => {
  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders income list with data', () => {
    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Check if income items are rendered
    expect(screen.getByText('Monthly salary')).toBeInTheDocument()
    expect(screen.getByText('Freelance project')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    expect(screen.getByText('$1,500.00')).toBeInTheDocument()
  })

  it('displays loading state', () => {
    renderWithProvider(
      <IncomeList
        incomes={[]}
        loading={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays empty state when no incomes', () => {
    renderWithProvider(
      <IncomeList
        incomes={[]}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/no income records found/i)).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()

    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Find and click the first edit button
    const editButtons = screen.getAllByLabelText(/edit income/i)
    await user.click(editButtons[0])

    expect(mockOnEdit).toHaveBeenCalledWith(mockIncomes[0])
  })

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup()

    // Mock window.confirm to return true
    window.confirm = jest.fn(() => true)

    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Find and click the first delete button
    const deleteButtons = screen.getAllByLabelText(/delete income/i)
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this income record?'
    )
    expect(mockOnDelete).toHaveBeenCalledWith(mockIncomes[0].id)
  })

  it('does not call onDelete when delete is cancelled', async () => {
    const user = userEvent.setup()

    // Mock window.confirm to return false
    window.confirm = jest.fn(() => false)

    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Find and click the first delete button
    const deleteButtons = screen.getAllByLabelText(/delete income/i)
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  it('filters incomes by search term', async () => {
    const user = userEvent.setup()

    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Find search input and type
    const searchInput = screen.getByPlaceholderText(/search incomes/i)
    await user.type(searchInput, 'salary')

    // Wait for filtering to apply
    await waitFor(() => {
      expect(screen.getByText('Monthly salary')).toBeInTheDocument()
      expect(screen.queryByText('Freelance project')).not.toBeInTheDocument()
    })
  })

  it('sorts incomes by amount', async () => {
    const user = userEvent.setup()

    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Find sort dropdown and select amount
    const sortSelect = screen.getByLabelText(/sort by/i)
    await user.click(sortSelect)

    const amountOption = screen.getByText(/amount/i)
    await user.click(amountOption)

    // Check if items are sorted (highest amount first)
    const incomeRows = screen.getAllByRole('row')
    expect(incomeRows[1]).toHaveTextContent('$5,000.00') // First data row
    expect(incomeRows[2]).toHaveTextContent('$1,500.00') // Second data row
  })

  it('displays category information correctly', () => {
    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getByText('Freelance')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Check if dates are formatted properly
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument()
  })

  it('handles pagination correctly', async () => {
    const user = userEvent.setup()

    // Create more mock data to test pagination
    const manyIncomes = Array.from({ length: 25 }, (_, index) => ({
      id: `income-${index + 1}`,
      amount: 1000 + index * 100,
      description: `Income ${index + 1}`,
      date: '2024-01-15',
      category: {
        id: 'cat-1',
        name: 'Salary',
        isDefault: true,
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    }))

    renderWithProvider(
      <IncomeList
        incomes={manyIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Check if pagination controls are present
    expect(screen.getByLabelText(/go to next page/i)).toBeInTheDocument()

    // Check if only first page items are shown (assuming 10 per page)
    expect(screen.getByText('Income 1')).toBeInTheDocument()
    expect(screen.getByText('Income 10')).toBeInTheDocument()
    expect(screen.queryByText('Income 11')).not.toBeInTheDocument()

    // Click next page
    const nextButton = screen.getByLabelText(/go to next page/i)
    await user.click(nextButton)

    // Check if second page items are shown
    await waitFor(() => {
      expect(screen.getByText('Income 11')).toBeInTheDocument()
      expect(screen.queryByText('Income 1')).not.toBeInTheDocument()
    })
  })

  it('calls onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup()

    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    const refreshButton = screen.getByLabelText(/refresh/i)
    await user.click(refreshButton)

    expect(mockOnRefresh).toHaveBeenCalled()
  })

  it('displays total amount correctly', () => {
    renderWithProvider(
      <IncomeList
        incomes={mockIncomes}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    )

    // Total should be 5000 + 1500 = 6500
    expect(screen.getByText('Total: $6,500.00')).toBeInTheDocument()
  })
})