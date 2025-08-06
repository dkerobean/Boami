import { UserInvitationService } from '@/lib/services/user-invitation.service';
import { User } from '@/lib/database/models/User';
import { Role } from '@/lib/database/models/Role';
import { Permission } from '@/lib/database/models/Permission';
import { Invitation } from '@/lib/database/models/Invitation';
import { connectToDatabase } from '@/lib/database/connection';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose fromongoose';
import crypto from 'crypto';

// Mock the email service
jest.mock('@/lib/services/email.service', () => ({
  EmailService: {
    sendInvitationEmail: jest.fn().mockResolvedValue(true)
  }
}));

describe('UserInvitationService', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testRole: any;
  let invitationService: UserInvitationService;

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
      description: 'Test role for invitations',
      permissions: [permission._id],
      isSystem: false
    });

    // Create test user (inviter)
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

    invitationService = new UserInvitationService();
  });

  describe('inviteUser', () => {
    it('should successfully create and send invitation', async () => {
      const result = await UserInvitationService.inviteUser(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString(),
        'Welcome to our platform!'
      );

      expect(result.success).toBe(true);
      expect(result.invitation).toBeDefined();
      expect(result.invitation.email).toBe('newuser@example.com');
      expect(result.invitation.role.toString()).toBe(testRole._id.toString());
      expect(result.invitation.invitedBy.toString()).toBe(testUser._id.toString());
      expect(result.invitation.status).toBe('pending');
      expect(result.invitation.token).toBeDefined();
      expect(result.invitation.expiresAt).toBeDefined();

      // Check that invitation was saved to database
      const savedInvitation = await Invitation.findById(result.invitation._id);
      expect(savedInvitation).toBeTruthy();
    });

    it('should fail if user already exists', async () => {
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

      const result = await UserInvitationService.inviteUser(
        'existing@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should fail if role does not exist', async () => {
      const fakeRoleId = new mongoose.Types.ObjectId().toString();

      const result = await UserInvitationService.inviteUser(
        'newuser@example.com',
        fakeRoleId,
        testUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Role not found');
    });

    it('should fail if inviter does not exist', async () => {
      const fakeInviterId = new mongoose.Types.ObjectId().toString();

      const result = await UserInvitationService.inviteUser(
        'newuser@example.com',
        testRole._id.toString(),
        fakeInviterId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Inviter not found');
    });

    it('should fail if inviter is not active', async () => {
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const result = await UserInvitationService.inviteUser(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });

    it('should generate unique tokens for different invitations', async () => {
      const result1 = await UserInvitationService.inviteUser(
        'user1@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      const result2 = await UserInvitationService.inviteUser(
        'user2@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.invitation.token).not.toBe(result2.invitation.token);
    });

    it('should set expiration date 48 hours from now', async () => {
      const beforeInvite = new Date();

      const result = await UserInvitationService.inviteUser(
        'newuser@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      const afterInvite = new Date();
      const expectedExpiry = new Date(beforeInvite.getTime() + (48 * 60 * 60 * 1000));
      const actualExpiry = new Date(result.invitation.expiresAt);

      expect(actualExpiry.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(actualExpiry.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });
  });

  describe('acceptInvitation', () => {
    let testInvitation: any;

    beforeEach(async () => {
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

    it('should successfully accept valid invitation', async () => {
      const userData = {
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!'
      };

      const result = await invitationService.acceptInvitation(
        testInvitation.token,
        userData
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('invited@example.com');
      expect(result.user.firstName).toBe('New');
      expect(result.user.lastName).toBe('User');
      expect(result.user.status).toBe('active');

      // Check that invitation status was updated
      const updatedInvitation = await Invitation.findById(testInvitation._id);
      expect(updatedInvitation.status).toBe('accepted');
      expect(updatedInvitation.acceptedAt).toBeDefined();

      // Check that user was created
      const createdUser = await User.findOne({ email: 'invited@example.com' });
      expect(createdUser).toBeTruthy();
      expect(createdUser.role.toString()).toBe(testRole._id.toString());
    });

    it('should fail for invalid token', async () => {
      const userData = {
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!'
      };

      const result = await invitationService.acceptInvitation(
        'invalid-token',
        userData
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid invitation');
    });

    it('should fail for expired invitation', async () => {
      // Update invitation to be expired
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        expiresAt: new Date(Date.now() - 1000)
      });

      const userData = {
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!'
      };

      const result = await invitationService.acceptInvitation(
        testInvitation.token,
        userData
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should fail for already accepted invitation', async () => {
      // Update invitation to accepted
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'accepted',
        acceptedAt: new Date()
      });

      const userData = {
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!'
      };

      const result = await invitationService.acceptInvitation(
        testInvitation.token,
        userData
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been accepted');
    });

    it('should fail if user already exists with same email', async () => {
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

      const userData = {
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!'
      };

      const result = await invitationService.acceptInvitation(
        testInvitation.token,
        userData
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should hash password before saving', async () => {
      const userData = {
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!'
      };

      const result = await invitationService.acceptInvitation(
        testInvitation.token,
        userData
      );

      expect(result.success).toBe(true);

      const createdUser = await User.findOne({ email: 'invited@example.com' });
      expect(createdUser.password).toBeDefined();
      expect(createdUser.password).not.toBe('SecurePassword123!');
      expect(createdUser.password.length).toBeGreaterThan(50); // Hashed password should be longer
    });
  });

  describe('resendInvitation', () => {
    let testInvitation: any;

    beforeEach(async () => {
      testInvitation = await Invitation.create({
        email: 'invited@example.com',
        role: testRole._id,
        token: crypto.randomBytes(32).toString('hex'),
        invitedBy: testUser._id,
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
        status: 'pending'
      });
    });

    it('should successfully resend valid invitation', async () => {
      const result = await invitationService.resendInvitation(
        testInvitation._id.toString(),
        testUser._id.toString()
      );

      expect(result.success).toBe(true);
      expect(result.invitation).toBeDefined();

      // Check that expiration was extended
      const updatedInvitation = await Invitation.findById(testInvitation._id);
      expect(new Date(updatedInvitation.expiresAt).getTime()).toBeGreaterThan(
        new Date(testInvitation.expiresAt).getTime()
      );
    });

    it('should fail for non-existent invitation', async () => {
      const fakeInvitationId = new mongoose.Types.ObjectId().toString();

      const result = await invitationService.resendInvitation(
        fakeInvitationId,
        testUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for already accepted invitation', async () => {
      await Invitation.findByIdAndUpdate(testInvitation._id, {
        status: 'accepted'
      });

      const result = await invitationService.resendInvitation(
        testInvitation._id.toString(),
        testUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been accepted');
    });

    it('should fail if requester is not the original inviter', async () => {
      // Create different user
      const otherUser = await User.create({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        name: 'Other User',
        role: testRole._id,
        status: 'active',
        isActive: true,
        isEmailVerified: true
      });

      const result = await invitationService.resendInvitation(
        testInvitation._id.toString(),
        otherUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });
  });

  describe('getInvitationByToken', () => {
    let testInvitation: any;

    beforeEach(async () => {
      testInvitation = await Invitation.create({
        email: 'invited@example.com',
        role: testRole._id,
        token: crypto.randomBytes(32).toString('hex'),
        invitedBy: testUser._id,
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)),
        status: 'pending'
      });
    });

    it('should return invitation for valid token', async () => {
      const invitation = await invitationService.getInvitationByToken(
        testInvitation.token
      );

      expect(invitation).toBeTruthy();
      expect(invitation._id.toString()).toBe(testInvitation._id.toString());
      expect(invitation.email).toBe('invited@example.com');
      expect(invitation.role).toBeDefined();
      expect(invitation.invitedBy).toBeDefined();
    });

    it('should return null for invalid token', async () => {
      const invitation = await invitationService.getInvitationByToken(
        'invalid-token'
      );

      expect(invitation).toBeNull();
    });

    it('should populate role and invitedBy fields', async () => {
      const invitation = await invitationService.getInvitationByToken(
        testInvitation.token
      );

      expect((invitation.role as any)?.name).toBe('Test Role');
      expect(invitation.invitedBy.email).toBe('inviter@example.com');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database connection to simulate error
      await mongoose.connection.close();

      const result = await UserInvitationService.inviteUser(
        'test@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Reconnect for cleanup
      await connectToDatabase();
    });

    it('should handle email service failures', async () => {
      // Mock email service to fail
      const { EmailService } = require('@/lib/services/email.service');
      EmailService.sendInvitationEmail.mockRejectedValueOnce(new Error('Email service down'));

      const result = await UserInvitationService.inviteUser(
        'test@example.com',
        testRole._id.toString(),
        testUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');

      // Reset mock
      EmailService.sendInvitationEmail.mockResolvedValue(true);
    });
  });

  describe('token generation', () => {
    it('should generate cryptographically secure tokens', async () => {
      const tokens = new Set();

      // Generate multiple invitations and check token uniqueness
      for (let i = 0; i < 100; i++) {
        const result = await UserInvitationService.inviteUser(
          `user${i}@example.com`,
          testRole._id.toString(),
          testUser._id.toString()
        );

        expect(result.success).toBe(true);
        expect(tokens.has(result.invitation.token)).toBe(false);
        tokens.add(result.invitation.token);

        // Check token format (should be hex string)
        expect(result.invitation.token).toMatch(/^[a-f0-9]+$/);
        expect(result.invitation.token.length).toBe(64); // 32 bytes = 64 hex chars
      }
    });
  });
});