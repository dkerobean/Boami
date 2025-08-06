import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/finance/expenses/route'
import { connectToDatabase } from '@/lib/database/connection'
import { Expense } from '@/lib/database/models/Expense'
import { ExpenseCategory } from '@/lib/database/models/ExpenseCategory'
import { Vendor } from '@/lib/database/models/Vendor'
import { User } from '@/lib/database/models/User'
import jwt from 'jsonwebtoken'

// Mock the database connection
jest.mock('@/lib/database/connection')

describe('/api/finance/expenses', () => {
  let mockUser: any
  let mockCategory: any
  let mockVendor: any
  let authToken: string

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks()

    // Mock database connection
    ;(connectToDatabase as jest.Mock).mockResolvedValue(true)

    // Create mock user
    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      name: 'Test User',
    }

    // Create mock category
    mockCategory = {
      _id: '507f1f77bcf86cd799439012',
      name: 'Office Supplies',
      userId: mockUser._id,
      isDefault: false,
    }

    // Create mock vendor
    mockVendor = {
      _id: '507f1f77bcf86cd799439013',
      name: 'Office Depot',
      email: 'orders@officedepot.com',
      phone: '555-0123',
      address: '123 Business St',
      userId: mockUser._id,
    }

    // Create auth token
    authToken = jwt.sign(
      { userId: mockUser._id, email: mockUser.email },
      process.env.JWT_SECRET || 'test-secret'
    )

    // Mock User.findById
    jest.spyOn(User, 'findById').mockResolvedValue(mockUser)

    // Mock ExpenseCategory.findById
    jest.spyOn(ExpenseCategory, 'findById').mockResolvedValue(mockCategory)

    // Mock Vendor.findById
    jest.spyOn(Vendor, 'findById').mockResolvedValue(mockVendor)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /api/finance/expenses', () => {
    it('should return expense records for authenticated user', async () => {
      const mockExpenses = [
        {
          _id: '507f1f77bcf86cd799439014',
          amount: 150.50,
          description: 'Office supplies',
          date: new Date('2024-01-15'),
          category: mockCategory._id,
          vendor: mockVendor._id,
          userId: mockUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: '507f1f77bcf86cd799439015',
          amount: 75.25,
          description: 'Printer paper',
          date: new Date('2024-01-20'),
          category: mockCategory._id,
          vendor: mockVendor._id,
          userId: mockUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Mock Expense.find with populate
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockExpenses),
      }
      jest.spyOn(Expense, 'find').mockReturnValue(mockQuery as any)
      jest.spyOn(Expense, 'countDocuments').mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/finance/expenses', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
      expect(Expense.find).toHaveBeenCalledWith({ userId: mockUser._id })
    })

    it('should filter expenses by category', async () => {
      const mockExpenses = [
        {
          _id: '507f1f77bcf86cd799439014',
          amount: 150.50,
          description: 'Office supplies',
          date: new Date('2024-01-15'),
          category: mockCategory._id,
          vendor: mockVendor._id,
          userId: mockUser._id,
        },
      ]

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockExpenses),
      }
      jest.spyOn(Expense, 'find').mockReturnValue(mockQuery as any)
      jest.spyOn(Expense, 'countDocuments').mockResolvedValue(1)

      const request = new NextRequest(
        `http://localhost:3000/api/finance/expenses?categoryId=${mockCategory._id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Expense.find).toHaveBeenCalledWith({
        userId: mockUser._id,
        category: mockCategory._id,
      })
    })

    it('should filter expenses by vendor', async () => {
      const mockExpenses = [
        {
          _id: '507f1f77bcf86cd799439014',
          amount: 150.50,
          description: 'Office supplies',
          date: new Date('2024-01-15'),
          category: mockCategory._id,
          vendor: mockVendor._id,
          userId: mockUser._id,
        },
      ]

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockExpenses),
      }
      jest.spyOn(Expense, 'find').mockReturnValue(mockQuery as any)
      jest.spyOn(Expense, 'countDocuments').mockResolvedValue(1)

      const request = new NextRequest(
        `http://localhost:3000/api/finance/expenses?vendorId=${mockVendor._id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Expense.find).toHaveBeenCalledWith({
        userId: mockUser._id,
        vendor: mockVendor._id,
      })
    })
  })

  describe('POST /api/finance/expenses', () => {
    it('should create a new expense record', async () => {
      const newExpenseData = {
        amount: 200.75,
        description: 'New office chairs',
        date: '2024-01-25',
        categoryId: mockCategory._id.toString(),
        vendorId: mockVendor._id.toString(),
      }

      const mockCreatedExpense = {
        _id: '507f1f77bcf86cd799439016',
        ...newExpenseData,
        date: new Date(newExpenseData.date),
        category: mockCategory._id,
        vendor: mockVendor._id,
        userId: mockUser._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439016',
          ...newExpenseData,
          category: mockCategory,
          vendor: mockVendor,
          userId: mockUser._id,
        }),
      }

      jest.spyOn(Expense.prototype, 'save').mockResolvedValue(mockCreatedExpense)
      jest.spyOn(Expense.prototype, 'populate').mockResolvedValue(mockCreatedExpense)

      const request = new NextRequest('http://localhost:3000/api/finance/expenses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpenseData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe(newExpenseData.amount)
      expect(data.data.description).toBe(newExpenseData.description)
    })

    it('should create expense without vendor', async () => {
      const newExpenseData = {
        amount: 50.00,
        description: 'Parking fee',
        date: '2024-01-25',
        categoryId: mockCategory._id.toString(),
        // No vendorId provided
      }

      const mockCreatedExpense = {
        _id: '507f1f77bcf86cd799439017',
        ...newExpenseData,
        date: new Date(newExpenseData.date),
        category: mockCategory._id,
        vendor: null,
        userId: mockUser._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439017',
          ...newExpenseData,
          category: mockCategory,
          vendor: null,
          userId: mockUser._id,
        }),
      }

      jest.spyOn(Expense.prototype, 'save').mockResolvedValue(mockCreatedExpense)
      jest.spyOn(Expense.prototype, 'populate').mockResolvedValue(mockCreatedExpense)

      const request = new NextRequest('http://localhost:3000/api/finance/expenses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpenseData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe(newExpenseData.amount)
      expect(data.data.vendor).toBeNull()
    })

    it('should return 400 for invalid input data', async () => {
      const invalidData = {
        amount: -100, // Invalid negative amount
        description: '',
        date: 'invalid-date',
        categoryId: 'invalid-id',
      }

      const request = new NextRequest('http://localhost:3000/api/finance/expenses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation')
    })

    it('should return 404 for non-existent category', async () => {
      const newExpenseData = {
        amount: 100,
        description: 'Test expense',
        date: '2024-01-25',
        categoryId: '507f1f77bcf86cd799439999', // Non-existent category
      }

      // Mock category not found
      jest.spyOn(ExpenseCategory, 'findById').mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/finance/expenses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpenseData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Expense category not found')
    })

    it('should return 404 for non-existent vendor', async () => {
      const newExpenseData = {
        amount: 100,
        description: 'Test expense',
        date: '2024-01-25',
        categoryId: mockCategory._id.toString(),
        vendorId: '507f1f77bcf86cd799439999', // Non-existent vendor
      }

      // Mock vendor not found
      jest.spyOn(Vendor, 'findById').mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/finance/expenses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpenseData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Vendor not found')
    })
  })
})