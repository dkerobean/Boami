import { SubscriptionEmailService } from '@/lib/email/subscription-email-service';
import { ResendClient } from '@/lib/email/resend-client';

// Mock ResendClient
jest.mock('@/lib/email/resend-client');

describe('SubscriptionEmailService', () => {
  const mockClient = {
    emails: {
      send: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ResendClient.getClient as jest.Mock).mockReturnValue(mockClient);
    (ResendClient.isValidEmail as jest.Mock).mockReturnValue(true);
    (ResendClient.formatSender as jest.Mock).mockImplementation((name) => `${name} <noreply@example.com>`);
    (ResendClient.formatSubject as jest.Mock).mockImplementation((subject) => subject);
  });

  describe('sendSubscriptionWelcome', () => {
    it('should send welcome email successfully', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'email123' },
        error: null
      });

      const props = {
        firstName: 'John',
        planName: 'Premium Plan',
        planPrice: 29.99,
        currency: 'USD',
        billingPeriod: 'monthly',
        features: ['Feature 1', 'Feature 2'],
        appUrl: 'https://example.com'
      };

      const result = await SubscriptionEmailService.sendSubscriptionWelcome('test@example.com', props);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email123');
      expect(mockClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: 'Welcome to Premium Plan!'
        })
      );
    });

    it('should handle email sending failure', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Email sending failed' }
      });

      const props = {
        firstName: 'John',
        planName: 'Premium Plan',
        planPrice: 29.99,
        currency: 'USD',
        billingPeriod: 'monthly',
        features: ['Feature 1'],
        appUrl: 'https://example.com'
      };

      const result = await SubscriptionEmailService.sendSubscriptionWelcome('test@example.com', props);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email sending failed');
    });

    it('should validate email address', async () => {
      (ResendClient.isValidEmail as jest.Mock).mockReturnValue(false);

      const props = {
        firstName: 'John',
        planName: 'Premium Plan',
        planPrice: 29.99,
        currency: 'USD',
        billingPeriod: 'monthly',
        features: ['Feature 1'],
        appUrl: 'https://example.com'
      };

      const result = await SubscriptionEmailService.sendSubscriptionWelcome('invalid-email', props);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address format');
      expect(mockClient.emails.send).not.toHaveBeenCalled();
    });
  });

  describe('sendRenewalReminder', () => {
    it('should send renewal reminder successfully', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'email456' },
        error: null
      });

      const props = {
        firstName: 'Jane',
        planName: 'Premium Plan',
        planPrice: 29.99,
        currency: 'USD',
        billingPeriod: 'monthly',
        renewalDate: '2024-02-01',
        appUrl: 'https://example.com'
      };

      const result = await SubscriptionEmailService.sendRenewalReminder('jane@example.com', props);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email456');
      expect(mockClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['jane@example.com'],
          subject: 'Your subscription renews soon'
        })
      );
    });
  });

  describe('sendSubscriptionCancelled', () => {
    it('should send cancellation email successfully', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'email789' },
        error: null
      });

      const props = {
        firstName: 'Bob',
        planName: 'Premium Plan',
        cancellationDate: '2024-01-15',
        accessEndDate: '2024-02-15',
        reason: 'User requested',
        appUrl: 'https://example.com'
      };

      const result = await SubscriptionEmailService.sendSubscriptionCancelled('bob@example.com', props);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email789');
      expect(mockClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['bob@example.com'],
          subject: 'Subscription Cancelled'
        })
      );
    });
  });

  describe('sendPaymentFailed', () => {
    it('should send payment failed email successfully', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'email101' },
        error: null
      });

      const props = {
        firstName: 'Alice',
        planName: 'Premium Plan',
        amount: 29.99,
        currency: 'USD',
        failureReason: 'Insufficient funds',
        retryDate: '2024-01-16',
        gracePeriodEnd: '2024-01-18',
        appUrl: 'https://example.com'
      };

      const result = await SubscriptionEmailService.sendPaymentFailed('alice@example.com', props);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email101');
      expect(mockClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['alice@example.com'],
          subject: 'Payment Failed - Action Required',
          headers: expect.objectContaining({
            'X-Priority': 'high'
          })
        })
      );
    });
  });

  describe('sendSubscriptionExpired', () => {
    it('should send expired email successfully', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'email202' },
        error: null
      });

      const props = {
        firstName: 'Charlie',
        planName: 'Premium Plan',
        expiredDate: '2024-01-15',
        appUrl: 'https://example.com'
      };

      const result = await SubscriptionEmailService.sendSubscriptionExpired('charlie@example.com', props);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email202');
      expect(mockClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['charlie@example.com'],
          subject: 'Subscription Expired'
        })
      );
    });
  });

  describe('sendSubscriptionRenewed', () => {
    it('should send renewed email successfully', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'email303' },
        error: null
      });

      const result = await SubscriptionEmailService.sendSubscriptionRenewed(
        'test@example.com',
        'David',
        'Premium Plan',
        29.99,
        'USD',
        '2024-02-15',
        'https://example.com'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email303');
      expect(mockClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: 'Subscription Renewed Successfully'
        })
      );
    });
  });

  describe('sendBatchEmails', () => {
    it('should send batch emails with rate limiting', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'batch-email' },
        error: null
      });

      const emailRequests = [
        {
          email: 'user1@example.com',
          type: 'welcome' as const,
          props: {
            firstName: 'User1',
            planName: 'Premium',
            planPrice: 29.99,
            currency: 'USD',
            billingPeriod: 'monthly',
            features: ['Feature 1'],
            appUrl: 'https://example.com'
          }
        },
        {
          email: 'user2@example.com',
          type: 'welcome' as const,
          props: {
            firstName: 'User2',
            planName: 'Premium',
            planPrice: 29.99,
            currency: 'USD',
            billingPeriod: 'monthly',
            features: ['Feature 1'],
            appUrl: 'https://example.com'
          }
        }
      ];

      const results = await SubscriptionEmailService.sendBatchEmails(emailRequests, 2, 100);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockClient.emails.send).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success/failure in batch', async () => {
      mockClient.emails.send
        .mockResolvedValueOnce({ data: { id: 'success' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Failed' } });

      const emailRequests = [
        {
          email: 'success@example.com',
          type: 'welcome' as const,
          props: {
            firstName: 'Success',
            planName: 'Premium',
            planPrice: 29.99,
            currency: 'USD',
            billingPeriod: 'monthly',
            features: ['Feature 1'],
            appUrl: 'https://example.com'
          }
        },
        {
          email: 'fail@example.com',
          type: 'welcome' as const,
          props: {
            firstName: 'Fail',
            planName: 'Premium',
            planPrice: 29.99,
            currency: 'USD',
            billingPeriod: 'monthly',
            features: ['Feature 1'],
            appUrl: 'https://example.com'
          }
        }
      ];

      const results = await SubscriptionEmailService.sendBatchEmails(emailRequests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('sendTestSubscriptionEmail', () => {
    it('should send test email successfully', async () => {
      mockClient.emails.send.mockResolvedValue({
        data: { id: 'test-email' },
        error: null
      });

      const result = await SubscriptionEmailService.sendTestSubscriptionEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-email');
      expect(mockClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: 'Subscription Email Service Test'
        })
      );
    });
  });
});