import { NextRequest } from 'next/server';
import { POST as flutterwaveWebhookHandler } from '@/app/api/webhooks/flutterwave/route';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { User, Subscription, Plan, Transaction } from '@/lib/database/models';
import mongoose from 'mongoose';

// Mock database connection
jest.mock('@/lib/database/mongoose-connection');

describe('Flutterwave Webhook Handler', () => {
  let testUser: any;
  let testPlan: any;
  let testSubscription: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock database models
    testUser = {
      _id: 'user123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    };

    testPlan = {
      _id: 'plan123',
      name: 'Premium Plan',
      price: { monthly: 29.99, annual: 299.99, currency: 'USD' }
    };

    testSubscription = {
      _id: 'sub123',
      userId: 'user123',
      planId: 'plan123',
      status: 'active',
      isActive: true,
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock environment variables
    process.env.FLUTTERWAVE_SECRET_HASH = 'test-secret-hash';
  });

  describe('Webhook Authentication', () => {
    it('should reject webhook without signature', async () => {
      const request = new Nettp://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        body: JSON.stringify({ event: 'charge.completed' })
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('verification failed');
    });

    it('should reject webhook with invalid signature', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'invalid-signature'
        },
        body: JSON.stringify({ event: 'charge.completed' })
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid signature');
    });

    it('should accept webhook with valid signature', async () => {
      const mockPayload = {
        event: 'charge.completed',
        data: {
          id: 'txn123',
          tx_ref: 'ref123',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: { email: 'test@example.com' },
          meta: { userId: 'user123', planId: 'plan123' }
        }
      };

      // Mock successful database operations
      (Transaction.findOne as jest.Mock).mockResolvedValue(null);
      (Transaction as any).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true),
        _id: 'new-txn-123'
      }));
      (Subscription.findById as jest.Mock).mockResolvedValue(testSubscription);

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Charge Completed Event', () => {
    beforeEach(() => {
      // Mock successful database operations
      (Transaction.findOne as jest.Mock).mockResolvedValue(null);
      (Transaction as any).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true),
        _id: 'new-txn-123'
      }));
    });

    it('should process successful charge for new subscription', async () => {
      const mockPayload = {
        event: 'charge.completed',
        data: {
          id: 'txn123',
          tx_ref: 'ref123',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: {
            email: 'test@example.com',
            name: 'John Doe',
            phone_number: '+1234567890'
          },
          meta: {
            userId: 'user123',
            planId: 'plan123',
            billingPeriod: 'monthly'
          }
        }
      };

      // Mock new subscription creation
      (Subscription as any).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true),
        _id: 'new-sub-123'
      }));

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Transaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          amount: 29.99,
          currency: 'USD',
          status: 'successful',
          flutterwaveTransactionId: 'txn123'
        })
      );
    });

    it('should process successful charge for existing subscription renewal', async () => {
      const mockPayload = {
        event: 'charge.completed',
        data: {
          id: 'txn456',
          tx_ref: 'ref456',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: { email: 'test@example.com' },
          meta: {
            userId: 'user123',
            planId: 'plan123',
            subscriptionId: 'sub123',
            billingPeriod: 'monthly'
          }
        }
      };

      (Subscription.findById as jest.Mock).mockResolvedValue(testSubscription);

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(testSubscription.save).toHaveBeenCalled();
      expect(testSubscription.status).toBe('active');
      expect(testSubscription.isActive).toBe(true);
    });

    it('should handle failed charge', async () => {
      const mockPayload = {
        event: 'charge.completed',
        data: {
          id: 'txn789',
          tx_ref: 'ref789',
          status: 'failed',
          amount: 29.99,
          currency: 'USD',
          customer: { email: 'test@example.com' },
          meta: {
            userId: 'user123',
            planId: 'plan123'
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should create transaction record but not create/update subscription
      expect(Transaction).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed'
        })
      );
    });

    it('should skip processing duplicate transactions', async () => {
      // Mock existing transaction
      (Transaction.findOne as jest.Mock).mockResolvedValue({
        _id: 'existing-txn',
        flutterwaveTransactionId: 'txn123'
      });

      const mockPayload = {
        event: 'charge.completed',
        data: {
          id: 'txn123', // Same transaction ID
          tx_ref: 'ref123',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: { email: 'test@example.com' },
          meta: { userId: 'user123', planId: 'plan123' }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should not create new transaction
      expect(Transaction).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Cancelled Event', () => {
    it('should process subscription cancellation', async () => {
      const mockPayload = {
        event: 'subscription.cancelled',
        data: {
          id: 'flw_sub_123',
          customer: { email: 'test@example.com' },
          plan: { name: 'Premium Plan' }
        }
      };

      const mockSubscription = {
        ...testSubscription,
        metadata: { flutterwaveSubscriptionId: 'flw_sub_123' }
      };

      (Subscription.findOne as jest.Mock).mockResolvedValue(mockSubscription);

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSubscription.status).toBe('cancelled');
      expect(mockSubscription.isActive).toBe(false);
      expect(mockSubscription.save).toHaveBeenCalled();
    });

    it('should handle cancellation for non-existent subscription', async () => {
      const mockPayload = {
        event: 'subscription.cancelled',
        data: {
          id: 'non_existent_sub',
          customer: { email: 'test@example.com' }
        }
      };

      (Subscription.findOne as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should not throw error for non-existent subscription
    });
  });

  describe('Transfer Completed Event', () => {
    it('should handle transfer completed event', async () => {
      const mockPayload = {
        event: 'transfer.completed',
        data: {
          id: 'transfer123',
          amount: 10.00,
          currency: 'USD',
          status: 'successful'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Unknown Event Handling', () => {
    it('should handle unknown webhook events gracefully', async () => {
      const mockPayload = {
        event: 'unknown.event',
        data: {
          id: 'unknown123',
          status: 'completed'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.received).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (connectToDatabase as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const mockPayload = {
        event: 'charge.completed',
        data: { id: 'txn123' }
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('processing failed');
    });

    it('should handle malformed JSON payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: 'invalid json'
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle missing required webhook data', async () => {
      const mockPayload = {
        event: 'charge.completed',
        data: {
          // Missing required fields like id, amount, etc.
          status: 'successful'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'verif-hash': 'test-secret-hash'
        },
        body: JSON.stringify(mockPayload)
      });

      const response = await flutterwaveWebhookHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should handle gracefully without creating invalid records
    });
  });
});