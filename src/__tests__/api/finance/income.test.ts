import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/finance/income/route'
import { connectToDatabase } from '@/lib/database/mongoose-connection'
import { Income } from '@/lib/database/models/Income'
import { IncomeCategory } from '@/lib/database/models/IncomeCategory'
import { User } from '@/lib/database/models/User'
import jwt from 'jsonwebtoken'

// Mock the database connection
jest.mock('@/lib/database/mongoose-connection')

describe('/api/finance/income', () => {
  let mockUser: any
  let mockCategory: any
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
      name: 'Salary',
      userId: mockUser._id,
      isDefault: false,
    }

    // Create auth token
    authToken = jwt.sign(
      { userId: mockUser._id, email: mockUser.email },
      process.env.JWT_SECRET || 'test-secret'
    )

    // Mock User.findById
    jest.spyOn(User, 'findById').mockResolvedValue(mockUser)

    // Mock IncomeCategory.findById
    jest.spyOn(IncomeCategory, 'findById').mockResolvedValue(mockCategory)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /api/finance/income', () => {
    it('should return income records for authenticated user', async () => {
      const mockIncomes = [
        {
          _id: '507f1f77bcf86cd799439013',
          amount: 5000,
          description: 'Monthly salary',
          date: new Date('2024-01-15'),
          category: mockCategory._id,
          userId: mockUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: '507f1f77bcf86cd799439014',
          amount: 1000,
          description: 'Freelance work',
          date: new Date('2024-01-20'),
          category: mockCategory._id,
          userId: mockUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Mock Income.find with populate
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockIncomes),
      }
      jest.spyOn(Income, 'find').mockReturnValue(mockQuery as any)
      jest.spyOn(Income, 'countDocuments').mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/finance/income', {
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
      expect(Income.find).toHaveBeenCalledWith({ userId: mockUser._id })
    })

    it('should return 401 for unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/finance/income')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    it('should filter income records by date range', async () => {
      const mockIncomes = [
        {
          _id: '507f1f77bcf86cd799439013',
          amount: 5000,
          description: 'Monthly salary',
          date: new Date('2024-01-15'),
          category: mockCategory._id,
          userId: mockUser._id,
        },
      ]

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockIncomes),
      }
      jest.spyOn(Income, 'find').mockReturnValue(mockQuery as any)
      jest.spyOn(Income, 'countDocuments').mockResolvedValue(1)

      const request = new NextRequest(
        'http://localhost:3000/api/finance/income?startDate=2024-01-01&endDate=2024-01-31',
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
      expect(Income.find).toHaveBeenCalledWith({
        userId: mockUser._id,
        date: {
          $gte: new Date('2024-01-01'),
          $lte: new Date('2024-01-31'),
        },
      })
    })
  })

  describe('POST /api/finance/income', () => {
    it('should create a new income record', async () => {
      const newIncomeData = {
        amount: 3000,
        description: 'Bonus payment',
        date: '2024-01-25',
        categoryId: mockCategory._id.toString(),
      }

      const mockCreatedIncome = {
        _id: '507f1f77bcf86cd799439015',
        ...newIncomeData,
        date: new Date(newIncomeData.date),
        category: mockCategory._id,
        userId: mockUser._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439015',
          ...newIncomeData,
          category: mockCategory,
          userId: mockUser._id,
        }),
      }

      jest.spyOn(Income.prototype, 'save').mockResolvedValue(mockCreatedIncome)
      jest.spyOn(Income.prototype, 'populate').mockResolvedValue(mockCreatedIncome)

      const request = new NextRequest('http://localhost:3000/api/finance/income', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newIncomeData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe(newIncomeData.amount)
      expect(data.data.description).toBe(newIncomeData.description)
    })

    it('should return 400 for invalid input data', async () => {
      const invalidData = {
        amount: -1000, // Invalid negative amount
        description: '',
        date: 'invalid-date',
        categoryId: 'invalid-id',
      }

      const request = new NextRequest('http://localhost:3000/api/finance/income', {
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
      const newIncomeData = {
        amount: 3000,
        description: 'Bonus payment',
        date: '2024-01-25',
        categoryId: '507f1f77bcf86cd799439999', // Non-existent category
      }

      // Mock category not found
      jest.spyOn(IncomeCategory, 'findById').mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/finance/income', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newIncomeData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Income category not found')
    })

    it('should return 403 for category not owned by user', async () => {
      const otherUserCategory = {
        ...mockCategory,
        userId: '507f1f77bcf86cd799439999', // Different user
      }

      jest.spyOn(IncomeCategory, 'findById').mockResolvedValue(otherUserCategory)

      const newIncomeData = {
        amount: 3000,
        description: 'Bonus payment',
        date: '2024-01-25',
        categoryId: mockCategory._id.toString(),
      }

      const request = new NextRequest('http://localhost:3000/api/finance/income', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newIncomeData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Access denied to this category')
    })
  })
})