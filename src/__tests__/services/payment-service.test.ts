import { PaymentService } from '@/lib/services/PaymentService';
import { FlutterwaveService } from '@/lib/services/FlutterwaveService';
import { Transaction } from '@/lib/database/models';

// Mock dependencies
jest.mock('@/lib/services/FlutterwaveService');
jest.mock('@/lib/database/models');

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePayment', () => {
    it('should initialize payment successfully', async () => {
      const mockFlutterwaveResponse = {
        success: true,
        data: {
          link: 'https://checkout.flutterwave.com/pay/test123',
          reference: 'FLW_REF_123'
        }
      };

      (FlutterwaveService.initializePayment as jest.Mock).mockResolvedValue(mockFlutterwaveResponse);

      const paymentData = {
        amount: 29.99,
        currency: 'USD',
        email: 'test@example.com',
        name: 'John Doe',
        phone: '+1234567890',
        metadata: {
          userId: 'user123',
          planId: 'plan123'
        }
      };

      const result = await PaymentService.initializePayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.paymentLink).toBe(mockFlutterwaveResponse.data.link);
      expect(result.reference).toBe(mockFlutterwaveResponse.data.reference);
      expect(FlutterwaveService.initializePayment).toHaveBeenCalledWith(paymentData);
    });

    it('should handle payment initialization failure', async () => {
      const mockFlutterwaveResponse = {
        success: false,
        error: 'Invalid payment data'
      };

      (FlutterwaveService.initializePayment as jest.Mock).mockResolvedValue(mockFlutterwaveResponse);

      const paymentData = {
        amount: 29.99,
        currency: 'USD',
        email: 'invalid-email',
        name: 'John Doe'
      };

      const result = await PaymentService.initializePayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid payment data');
    });

    it('should validate required payment fields', async () => {
      const incompletePaymentData = {
        amount: 29.99,
        currency: 'USD'
        // Missing email and name
      };

      const result = await PaymentService.initializePayment(incompletePaymentData as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment successfully', async () => {
      const mockVerificationResponse = {
        success: true,
        data: {
          id: 'txn123',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: {
            email: 'test@example.com',
            name: 'John Doe'
          },
          meta: {
            userId: 'user123',
            planId: 'plan123'
          }
        }
      };

      (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValue(mockVerificationResponse);

      const result = await PaymentService.verifyPayment('txn123');

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction.status).toBe('successful');
      expect(FlutterwaveService.verifyPayment).toHaveBeenCalledWith('txn123');
    });

    it('should handle failed payment verification', async () => {
      const mockVerificationResponse = {
        success: true,
        data: {
          id: 'txn123',
          status: 'failed',
          amount: 29.99,
          currency: 'USD'
        }
      };

      (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValue(mockVerificationResponse);

      const result = await PaymentService.verifyPayment('txn123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment failed');
    });

    it('should handle verification service error', async () => {
      (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Transaction not found'
      });

      const result = await PaymentService.verifyPayment('invalid_txn');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction not found');
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const mockTransaction = {
        _id: 'txn123',
        flutterwaveTransactionId: 'flw_txn_123',
        amount: 29.99,
        currency: 'USD',
        status: 'successful'
      };

      const mockRefundResponse = {
        success: true,
        data: {
          id: 'refund123',
          status: 'successful',
          amount: 29.99
        }
      };

      (Transaction.findById as jest.Mock).mockResolvedValue(mockTransaction);
      (FlutterwaveService.processRefund as jest.Mock).mockResolvedValue(mockRefundResponse);

      const result = await PaymentService.processRefund('txn123', 29.99, 'Customer request');

      expect(result.success).toBe(true);
      expect(result.refund).toBeDefined();
      expect(FlutterwaveService.processRefund).toHaveBeenCalledWith(
        'flw_txn_123',
        29.99,
        'Customer request'
      );
    });

    it('should fail when transaction not found', async () => {
      (Transaction.findById as jest.Mock).mockResolvedValue(null);

      const result = await PaymentService.processRefund('nonexistent', 29.99, 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction not found');
    });

    it('should validate refund amount', async () => {
      const mockTransaction = {
        _id: 'txn123',
        amount: 29.99,
        currency: 'USD',
        status: 'successful'
      };

      (Transaction.findById as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await PaymentService.processRefund('txn123', 50.00, 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Refund amount cannot exceed');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for user', async () => {
      const mockTransactions = [
        {
          _id: 'txn1',
          userId: 'user123',
          amount: 29.99,
          status: 'successful',
          createdAt: new Date()
        },
        {
          _id: 'txn2',
          userId: 'user123',
          amount: 49.99,
          status: 'successful',
          createdAt: new Date()
        }
      ];

      (Transaction.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue(mockTransactions)
          })
        })
      });

      (Transaction.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await PaymentService.getPaymentHistory('user123', {
        page: 1,
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter payment history by status', async () => {
      const mockTransactions = [
        {
          _id: 'txn1',
          userId: 'user123',
          amount: 29.99,
          status: 'successful'
        }
      ];

      (Transaction.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue(mockTransactions)
          })
        })
      });

      const result = await PaymentService.getPaymentHistory('user123', {
        status: 'successful',
        page: 1,
        limit: 10
      });

      expect(Transaction.find).toHaveBeenCalledWith({
        userId: 'user123',
        status: 'successful'
      });
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax for US customers', async () => {
      const result = await PaymentService.calculateTax(100, 'USD', 'US', 'CA');

      expect(result.success).toBe(true);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.taxRate).toBeGreaterThan(0);
      expect(result.totalAmount).toBe(100 + result.taxAmount);
    });

    it('should return zero tax for non-taxable regions', async () => {
      const result = await PaymentService.calculateTax(100, 'USD', 'XX', null);

      expect(result.success).toBe(true);
      expect(result.taxAmount).toBe(0);
      expect(result.taxRate).toBe(0);
      expect(result.totalAmount).toBe(100);
    });
  });

  describe('validatePaymentMethod', () => {
    it('should validate credit card payment method', async () => {
      const paymentMethod = {
        type: 'card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      };

      const result = await PaymentService.validatePaymentMethod(paymentMethod);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid credit card number', async () => {
      const paymentMethod = {
        type: 'card',
        cardNumber: '1234567890123456',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      };

      const result = await PaymentService.validatePaymentMethod(paymentMethod);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid card number');
    });

    it('should reject expired card', async () => {
      const paymentMethod = {
        type: 'card',
        cardNumber: '4111111111111111',
        expiryMonth: '01',
        expiryYear: '2020',
        cvv: '123'
      };

      const result = await PaymentService.validatePaymentMethod(paymentMethod);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Card has expired');
    });
  });
});