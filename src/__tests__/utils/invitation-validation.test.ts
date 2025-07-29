import { InvitationValidator } from '@/lib/utils/invitation-validation';
import { User } from '@/lib/database/models/User';
import { Role } from '@/lib/database/models/Role';
import { Permission } from '@/lib/database/models/Permission';
import { Invitation } from '@/lib/database/models/Invitation';
import { connectToDatabase } from '@/lib/database/connection';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import crypto from 'crypto';

describe('InvitationValidator', () => {
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
      description: 'Can view users'  });

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

  describe('validateInvitation', () => {
    it('should validate a valid invitation', async () => {
      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(true);
      expect(result.invitation).toBeDefined();
      expect(result.invitation.email).toBe('invited@example.com');
      expect(result.invitation.validation.isValid).toBe(true);
    });

    it('should fail for missing token', async () => {
      const result = await InvitationValidator.validateInvitation('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('MISSING_TOKEN');
    });

    it('should fail for invalid token format', async () => {
      const result = await InvitationValidator.validateInvitation('short');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('should fail for non-existent token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');

      const result = await InvitationValidator.validateInvitation(fakeToken);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('TOKEN_NOT_FOUND');
    });

    it('should fail for expired invitation', async () => {
      // Update invitation to be expired
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        expiresAt: new Date(Date.now() - 1000)
      });

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITATION_EXPIRED');
      expect(result.error.details).toBeDefined();
      expect(result.error.details.canRequestNew).toBe(true);
    });

    it('should fail for already accepted invitation', async () => {
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'accepted',
        acceptedAt: new Date()
      });

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('ALREADY_ACCEPTED');
    });

    it('should fail for cancelled invitation', async () => {
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'cancelled'
      });

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITATION_CANCELLED');
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

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('USER_EXISTS');
      expect(result.error.details.canSignIn).toBe(true);
    });

    it('should fail if role no longer exists', async () => {
      // Delete the role
      await Role.findByIdAndDelete(testRole._id);

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('ROLE_NOT_FOUND');
    });

    it('should fail if inviter is no longer active', async () => {
      await User.findByIdAndUpdate(testUser._id, { status: 'disabled' });

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVITER_INACTIVE');
    });

    it('should show warning for expiring invitation', async () => {
      // Update invitation to expire in 12 hours
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        expiresAt: new Date(Date.now() + (12 * 60 * 60 * 1000))
      });

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('expire in');
    });

    it('should update expired status when configured', async () => {
      // Update invitation to be expired
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        expiresAt: new Date(Date.now() - 1000),
        status: 'pending'
      });

      await InvitationValidator.validateInvitation(
        testInvitation.token,
        { updateExpiredStatus: true }
      );

      // Check that status was updated
      const updatedInvitation = await Invitation.findById(testInvitation._id);
      expect(updatedInvitation.status).toBe('expired');
    });

    it('should skip user existence check when configured', async () => {
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

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token,
        { checkUserExists: false }
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMultipleInvitations', () => {
    let secondInvitation: any;

    beforeEach(async () => {
      secondInvitation = await Invitation.create({
        email: 'second@example.com',
        role: testRole._id,
        token: crypto.randomBytes(32).toString('hex'),
        invitedBy: testUser._id,
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
        status: 'pending'
      });
    });

    it('should validate multiple invitations', async () => {
      const tokens = [testInvitation.token, secondInvitation.token];

      const results = await InvitationValidator.validateMultipleInvitations(tokens);

      expect(Object.keys(results)).toHaveLength(2);
      expect(results[testInvitation.token].isValid).toBe(true);
      expect(results[secondInvitation.token].isValid).toBe(true);
    });

    it('should handle mixed valid and invalid tokens', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');
      const tokens = [testInvitation.token, fakeToken];

      const results = await InvitationValidator.validateMultipleInvitations(tokens);

      expect(Object.keys(results)).toHaveLength(2);
      expect(results[testInvitation.token].isValid).toBe(true);
      expect(results[fakeToken].isValid).toBe(false);
      expect(results[fakeToken].error.code).toBe('TOKEN_NOT_FOUND');
    });

    it('should process invitations in parallel', async () => {
      const tokens = Array.from({ length: 10 }, () =>
        crypto.randomBytes(32).toString('hex')
      );

      const startTime = Date.now();
      const results = await InvitationValidator.validateMultipleInvitations(tokens);
      const endTime = Date.now();

      expect(Object.keys(results)).toHaveLength(10);

      // Should complete relatively quickly due to parallel processing
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('getInvitationStats', () => {
    beforeEach(async () => {
      // Create various invitation statuses
      await Invitation.create([
        {
          email: 'pending1@example.com',
          role: testRole._id,
          token: crypto.randomBytes(32).toString('hex'),
          invitedBy: testUser._id,
          expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
          status: 'pending'
        },
        {
          email: 'accepted@example.com',
          role: testRole._id,
          token: crypto.randomBytes(32).toString('hex'),
          invitedBy: testUser._id,
          expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
          status: 'accepted',
          acceptedAt: new Date()
        },
        {
          email: 'expired@example.com',
          role: testRole._id,
          token: crypto.randomBytes(32).toString('hex'),
          invitedBy: testUser._id,
          expiresAt: new Date(Date.now() - 1000),
          status: 'expired'
        },
        {
          email: 'cancelled@example.com',
          role: testRole._id,
          token: crypto.randomBytes(32).toString('hex'),
          invitedBy: testUser._id,
          expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
          status: 'cancelled'
        },
        {
          email: 'expiring@example.com',
          role: testRole._id,
          token: crypto.randomBytes(32).toString('hex'),
          invitedBy: testUser._id,
          expiresAt: new Date(Date.now() + (12 * 60 * 60 * 1000)), // 12 hours
          status: 'pending'
        }
      ]);
    });

    it('should return correct invitation statistics', async () => {
      const stats = await InvitationValidator.getInvitationStats();

      expect(stats.total).toBe(6); // Including the one from beforeEach
      expect(stats.pending).toBe(3); // Including the one from beforeEach + pending1 + expiring
      expect(stats.accepted).toBe(1);
      expect(stats.expired).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.expiringSoon).toBe(1); // The one expiring in 12 hours
    });

    it('should handle empty database', async () => {
      await Invitation.deleteMany({});

      const stats = await InvitationValidator.getInvitationStats();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.accepted).toBe(0);
      expect(stats.expired).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.expiringSoon).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      // Close database connection
      await mongoose.connection.close();

      const result = await InvitationValidator.validateInvitation(
        testInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INTERNAL_ERROR');

      // Reconnect for cleanup
      await connectToDatabase();
    });

    it('should handle malformed tokens gracefully', async () => {
      const result = await InvitationValidator.validateInvitation(
        'malformed-token-with-special-chars-!@#$%'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('should handle CastError for invalid ObjectIds', async () => {
      // Create invitation with invalid ObjectId reference
      const invalidInvitation = new Invitation({
        email: 'invalid@example.com',
        role: 'invalid-object-id',
        token: crypto.randomBytes(32).toString('hex'),
        invitedBy: testUser._id,
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
        status: 'pending'
      });

      // Save without validation to bypass Mongoose validation
      await invalidInvitation.save({ validateBeforeSave: false });

      const result = await InvitationValidator.validateInvitation(
        invalidInvitation.token
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_TOKEN_FORMAT');
    });
  });

  describe('token format validation', () => {
    it('should accept valid hex tokens', async () => {
      const validToken = crypto.randomBytes(32).toString('hex');

      // Create invitation with valid token
      await Invitation.create({
        email: 'valid@example.com',
        role: testRole._id,
        token: validToken,
        invitedBy: testUser._id,
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
        status: 'pending'
      });

      const result = await InvitationValidator.validateInvitation(validToken);

      expect(result.isValid).toBe(true);
    });

    it('should reject tokens with invalid characters', async () => {
      const invalidTokens = [
        'token-with-dashes',
        'token with spaces',
        'token@with#special!chars',
        'token/with\\slashes'
      ];

      for (const token of invalidTokens) {
        const result = await InvitationValidator.validateInvitation(token);
        expect(result.isValid).toBe(false);
        expect(result.error.code).toBe('INVALID_TOKEN_FORMAT');
      }
    });

    it('should reject tokens that are too short', async () => {
      const shortToken = 'short';

      const result = await InvitationValidator.validateInvitation(shortToken);

      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_TOKEN_FORMAT');
    });
  });
});