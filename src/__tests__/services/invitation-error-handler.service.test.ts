import { InvitationErrorHandler } from '@/lib/services/invitation-error-handler.service';
import { User } from '@/lib/database/models/User';
import { Role } from '@/lib/database/models/Role';
import { Permission } from '@/lib/database/models/Permission';
import { Invitation } from '@/lib/database/models/Invitation';
import { connectToDatabase } from '@/lib/database/connection';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Mock the UserInvitationService
jest.mock('@/lib/services/user-invitation.service', () => ({
  UserInvitationService: jest.fn().mockImplementation(() => ({
    inviteUser: jest.fn().mockResolvedValue({
      success: true,
      invitation: {
        _id: new mongoose.Types.ObjectId(),
        email: 'test@example.com',
        token: 'new-token'
      }
    })
  }))
}));

describe('InvitationErrorHandler', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testRole: any;
  let testInvitation: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    process.env.MONGODB_URI = mongoUri;
    await connectToDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await Invitation.deleteMany({});

    // Create test permission
    const permission = await Permission.create({
      name: 'Read Users',
      resource: 'users',
      action: 'read',
      description: 'Can view users'
    });

    // Create test role
    testRole = await Role.create({
      name: 'Test Role',
      description: 'Test role',
      permissions: [permission._id],
      isSystem: false
    });

    // Create test user
    testUser = await User.create({
      email: 'inviter@example.com',
      firstName: 'Test',
      lastName: 'Inviter',
      name: 'Test Inviter',
      role: testRole._id,
      status: 'active',
      isActive: true,
      isEmailVerified: true
    });

    // Create test invitation
    testInvitation = await Invitation.create({
      email: 'invited@example.com',
      role: testRole._id,
      token: crypto.randomBytes(32).toString('hex'),
      invitedBy: testUser._id,
      expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
      status: 'pending'
    });
  });

  describe('handleDuplicateEmailInvitation', () => {
    it('should return error action if user already exists', async () => {
      // Create existing user
      await User.create({
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        name: 'Existing User',
        role: testRole._id,
        status: 'active',
        isActive: true,
        isEmailVerified: true
      });

      const result = await InvitationErrorHandler.handleDuplicateEmailInvitation(
        'existing@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.action).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('USER_ALREADY_EXISTS');
      expect(result.error.recoverable).toBe(false);
    });

    it('should return resend action for same role pending invitation', async () => {
esult = await InvitationErrorHandler.handleDuplicateEmailInvitation(
        'invited@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.action).toBe('resend');
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITATION_ALREADY_PENDING');
      expect(result.error.recoverable).toBe(true);
    });

    it('should return update action for different role pending invitation', async () => {
      // Create different role
      const differentRole = await Role.create({
        name: 'Different Role',
        description: 'Different role',
        permissions: [],
        isSystem: false
      });

      const result = await InvitationErrorHandler.handleDuplicateEmailInvitation(
        'invited@example.com',
        differentRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.action).toBe('update');
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITATION_ROLE_CONFLICT');
      expect(result.error.recoverable).toBe(true);
    });

    it('should return resend action for recently expired invitation', async () => {
      // Update invitation to be recently expired
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'expired',
        expiresAt: new Date(Date.now() - (2 * 60 * 60 * 1000)) // 2 hours ago
      });

      const result = await InvitationErrorHandler.handleDuplicateEmailInvitation(
        'invited@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.action).toBe('resend');
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITATION_RECENTLY_EXPIRED');
      expect(result.error.recoverable).toBe(true);
    });

    it('should return resend action for no existing invitations', async () => {
      const result = await InvitationErrorHandler.handleDuplicateEmailInvitation(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.action).toBe('resend');
      expect(result.error).toBeUndefined();
    });
  });

  describe('handleExpiredInvitation', () => {
    it('should successfully renew expired invitation', async () => {
      // Update invitation to be expired
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'expired',
        expiresAt: new Date(Date.now() - 1000)
      });

      const result = await InvitationErrorHandler.handleExpiredInvitation(
        testInvitation._id.toString()
      );

      expect(result.canRenew).toBe(true);
      expect(result.newInvitation).toBeDefined();

      // Check that old invitation was marked as replaced
      const oldInvitation = await Invitation.findById(testInvitation._id);
      expect(oldInvitation.status).toBe('replaced');
      expect(oldInvitation.replacedBy).toBeDefined();
    });

    it('should fail if invitation not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const result = await InvitationErrorHandler.handleExpiredInvitation(fakeId);

      expect(result.canRenew).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITATION_NOT_FOUND');
    });

    it('should fail if invitation is not expired', async () => {
      const result = await InvitationErrorHandler.handleExpiredInvitation(
        testInvitation._id.toString()
      );

      expect(result.canRenew).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITATION_NOT_EXPIRED');
    });

    it('should fail if user already exists', async () => {
      // Create user with same email
      await User.create({
        email: 'invited@example.com',
        firstName: 'Existing',
        lastName: 'User',
        name: 'Existing User',
        role: testRole._id,
        status: 'active',
        isActive: true,
        isEmailVerified: true
      });

      // Update invitation to be expired
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'expired',
        expiresAt: new Date(Date.now() - 1000)
      });

      const result = await InvitationErrorHandler.handleExpiredInvitation(
        testInvitation._id.toString()
      );

      expect(result.canRenew).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('USER_ALREADY_EXISTS');
    });

    it('should fail if inviter is no longer active', async () => {
      // Deactivate inviter
      await User.findByIdAndUpdate(testUser._id, { status: 'disabled' });

      // Update invitation to be expired
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'expired',
        expiresAt: new Date(Date.now() - 1000)
      });

      const result = await InvitationErrorHandler.handleExpiredInvitation(
        testInvitation._id.toString()
      );

      expect(result.canRenew).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITER_NO_LONGER_ACTIVE');
    });
  });

  describe('validateInvitationRequest', () => {
    it('should pass validation for valid request', async () => {
      const result = await InvitationErrorHandler.validateInvitationRequest(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for invalid email format', async () => {
      const result = await InvitationErrorHandler.validateInvitationRequest(
        'invalid-email',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_EMAIL_FORMAT');
    });

    it('should fail for blocked email domain', async () => {
      const result = await InvitationErrorHandler.validateInvitationRequest(
        'user@tempmail.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('BLOCKED_EMAIL_DOMAIN');
    });

    it('should fail for non-existent role', async () => {
      const fakeRoleId = new mongoose.Types.ObjectId().toString();

      const result = await InvitationErrorHandler.validateInvitationRequest(
        'newuser@example.com',
        fakeRoleId,
        testUser._id.toString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('ROLE_NOT_FOUND');
    });

    it('should fail for inactive inviter', async () => {
      await User.findByIdAndUpdate(testUser._id, { status: 'disabled' });

      const result = await InvitationErrorHandler.validateInvitationRequest(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITER_INVALID');
    });

    it('should fail for rate limit exceeded', async () => {
      // Create 10 recent invitations to trigger rate limit
      const recentInvitations = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        role: testRole._id,
        token: crypto.randomBytes(32).toString('hex'),
        invitedBy: testUser._id,
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
        status: 'pending',
        createdAt: new Date()
      }));

      await Invitation.insertMany(recentInvitations);

      const result = await InvitationErrorHandler.validateInvitationRequest(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should show warning when approaching rate limit', async () => {
      // Create 5 recent invitations to trigger warning
      const recentInvitations = Array.from({ length: 5 }, (_, i) => ({
        email: `user${i}@example.com`,
        role: testRole._id,
        token: crypto.randomBytes(32).toString('hex'),
        invitedBy: testUser._id,
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
        status: 'pending',
        createdAt: new Date()
      }));

      await Invitation.insertMany(recentInvitations);

      const result = await InvitationErrorHandler.validateInvitationRequest(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('approaching the invitation rate limit');
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first attempt for successful operation', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await InvitationErrorHandler.retryOperation(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout error'))
        .mockResolvedValue('success');

      const result = await InvitationErrorHandler.retryOperation(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Invalid email format'));

      await expect(
        InvitationErrorHandler.retryOperation(mockOperation)
      ).rejects.toThrow('Invalid email format');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry limit', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(
        InvitationErrorHandler.retryOperation(mockOperation, { maxRetries: 2 })
      ).rejects.toThrow('Network error');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Network error'));

      const startTime = Date.now();

      try {
        await InvitationErrorHandler.retryOperation(mockOperation, {
          maxRetries: 2,
          retryDelay: 100,
          exponentialBackoff: true
        });
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should take at least 100ms + 200ms = 300ms due to exponential backoff
      expect(totalTime).toBeGreaterThan(250);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('getErrorDisplay', () => {
    it('should return appropriate display for USER_ALREADY_EXISTS', () => {
      const error = {
        code: 'USER_ALREADY_EXISTS',
        message: 'User exists',
        recoverable: false,
        retryable: false
      };

      const display = InvitationErrorHandler.getErrorDisplay(error);

      expect(display.title).toBe('User Already Exists');
      expect(display.action).toBe('Go to Sign In');
      expect(display.actionType).toBe('primary');
    });

    it('should return appropriate display for INVITATION_EXPIRED', () => {
      const error = {
        code: 'INVITATION_RECENTLY_EXPIRED',
        message: 'Invitation expired',
        recoverable: true,
        retryable: false
      };

      const display = InvitationErrorHandler.getErrorDisplay(error);

      expect(display.title).toBe('Invitation Expired');
      expect(display.action).toBe('Send New Invitation');
      expect(display.actionType).toBe('primary');
    });

    it('should return default display for unknown error code', () => {
      const error = {
        code: 'UNKNOWN_ERROR',
        message: 'Something went wrong',
        recoverable: true,
        retryable: true
      };

      const display = InvitationErrorHandler.getErrorDisplay(error);

      expect(display.title).toBe('Error');
      expect(display.message).toBe('Something went wrong');
      expect(display.actionType).toBe('secondary');
    });
  });

  describe('logInvitationError', () => {
    it('should log error with context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        recoverable: true,
        retryable: false
      };

      const context = {
        email: 'test@example.com',
        invitedBy: testUser._id.toString(),
        operation: 'test_operation'
      };

      InvitationErrorHandler.logInvitationError(error, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invitation Error:',
        expect.stringContaining('TEST_ERROR')
      );

      consoleSpy.mockRestore();
    });
  });
});