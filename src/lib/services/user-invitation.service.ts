import { Types } from 'mongoose';
import crypto from 'crypto';
import { User, Role, Invitation } from '../database/models';
import { EmailService } from './email.service';

/**
 * User Invitation Service
 * Handles user invitations, token generation, and acceptance workflow
 */
export class UserInvitationService {
  /**
   * Send invitation to a user
   */
  static async inviteUser(
    email: string,
    roleId: Types.ObjectId | string,
    invitedBy: Types.ObjectId | string,
    customMessage?: string
  ): Promise<{
    success: boolean;
    invitation?: any;
    error?: string;
  }> {
    try {
      // Validate email format
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Check if there's already a pending invitation
      const existingInvitation = await Invitation.findOne({
        email: email.toLowerCase(),
        status: 'pending'
      });

      if (existingInvitation && !existingInvitation.isExpired()) {
        return {
          success: false,
          error: 'Pending invitalready exists for this email'
        };
      }

      // Validate role exists
      const role = await Role.findById(roleId);
      if (!role) {
        return { success: false, error: 'Invalid role specified' };
      }

      // Validate inviter exists
      const inviter = await User.findById(invitedBy);
      if (!inviter) {
        return { success: false, error: 'Invalid inviter' };
      }

      // Create or update invitation
      let invitation;
      if (existingInvitation) {
        // Regenerate token for expired invitation
        await existingInvitation.generateNewToken();
        invitation = existingInvitation;
      } else {
        // Create new invitation
        invitation = await Invitation.createInvitation(
          email,
          new Types.ObjectId(roleId),
          new Types.ObjectId(invitedBy)
        );
      }

      // Populate invitation with role and inviter details
      await invitation.populate([
        { path: 'role', select: 'name description' },
        { path: 'invitedBy', select: 'firstName lastName email' }
      ]);

      // Send invitation email
      const emailSent = await EmailService.sendInvitationEmail(
        invitation,
        customMessage
      );

      if (!emailSent) {
        return {
          success: false,
          error: 'Failed to send invitation email'
        };
      }

      return {
        success: true,
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          expiresAt: invitation.expiresAt,
          status: invitation.status
        }
      };
    } catch (error) {
      console.error('Error inviting user:', error);
      return {
        success: false,
        error: 'Failed to send invitation'
      };
    }
  }

  /**
   * Resend invitation
   */
  static async resendInvitation(
    invitationId: Types.ObjectId | string,
    resendBy: Types.ObjectId | string
  ): Promise<{
    success: boolean;
    invitation?: any;
    error?: string;
  }> {
    try {
      const invitation = await Invitation.findById(invitationId).populate([
        { path: 'role', select: 'name description' },
        { path: 'invitedBy', select: 'firstName lastName email' }
      ]);

      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      if (invitation.status === 'accepted') {
        return { success: false, error: 'Invitation already accepted' };
      }

      // Generate new token and extend expiry
      await invitation.generateNewToken();

      // Send invitation email
      const emailSent = await EmailService.sendInvitationEmail(invitation);

      if (!emailSent) {
        return {
          success: false,
          error: 'Failed to resend invitation email'
        };
      }

      return {
        success: true,
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          expiresAt: invitation.expiresAt,
          status: invitation.status
        }
      };
    } catch (error) {
      console.error('Error resending invitation:', error);
      return {
        success: false,
        error: 'Failed to resend invitation'
      };
    }
  }

  /**
   * Validate invitation token
   */
  static async validateInvitationToken(token: string): Promise<{
    valid: boolean;
    invitation?: any;
    error?: string;
  }> {
    try {
      const invitation = await Invitation.findByToken(token);

      if (!invitation) {
        return { valid: false, error: 'Invalid invitation token' };
      }

      if (invitation.status === 'accepted') {
        return { valid: false, error: 'Invitation already accepted' };
      }

      if (invitation.isExpired()) {
        await invitation.markAsExpired();
        return { valid: false, error: 'Invitation has expired' };
      }

      return {
        valid: true,
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          expiresAt: invitation.expiresAt,
          token: invitation.token
        }
      };
    } catch (error) {
      console.error('Error validating invitation token:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Accept invitation and create user account
   */
  static async acceptInvitation(
    token: string,
    userData: {
      firstName: string;
      lastName: string;
      password: string;
    }
  ): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      // Validate invitation token
      const tokenValidation = await this.validateInvitationToken(token);
      if (!tokenValidation.valid) {
        return {
          success: false,
          error: tokenValidation.error
        };
      }

      const invitation = tokenValidation.invitation;

      // Check if user already exists (race condition protection)
      const existingUser = await User.findByEmail(invitation.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User account already exists'
        };
      }

      // Create user account
      const user = new User({
        email: invitation.email,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        password: userData.password,
        role: invitation.role._id,
        status: 'active',
        invitedBy: invitation.invitedBy._id,
        invitedAt: invitation.createdAt,
        isActive: true,
        isEmailVerified: true, // Email is verified through invitation acceptance
        emailVerifiedAt: new Date()
      });

      await user.save();

      // Mark invitation as accepted
      const fullInvitation = await Invitation.findById(invitation.id);
      if (fullInvitation) {
        await fullInvitation.markAsAccepted();
      }

      // Send welcome email
      await EmailService.sendWelcomeEmail(user, invitation.role);

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: invitation.role,
          status: user.status
        }
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return {
        success: false,
        error: 'Failed to accept invitation'
      };
    }
  }

  /**
   * Get pending invitations
   */
  static async getPendingInvitations(
    filters?: {
      email?: string;
      roleId?: Types.ObjectId | string;
      invitedBy?: Types.ObjectId | string;
    }
  ): Promise<any[]> {
    try {
      let query: any = { status: 'pending' };

      if (filters?.email) {
        query.email = { $regex: filters.email, $options: 'i' };
      }

      if (filters?.roleId) {
        query.role = filters.roleId;
      }

      if (filters?.invitedBy) {
        query.invitedBy = filters.invitedBy;
      }

      const invitations = await Invitation.find(query)
        .populate('role', 'name description')
        .populate('invitedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return invitations.map(inv => ({
        id: inv._id,
        email: inv.email,
        role: inv.role,
        invitedBy: inv.invitedBy,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        isExpired: inv.isExpired()
      }));
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      return [];
    }
  }

  /**
   * Cancel invitation
   */
  static async cancelInvitation(
    invitationId: Types.ObjectId | string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const invitation = await Invitation.findById(invitationId);

      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      if (invitation.status === 'accepted') {
        return { success: false, error: 'Cannot cancel accepted invitation' };
      }

      await invitation.markAsExpired();

      return { success: true };
    } catch (error) {
      console.error('Error canceling invitation:', error);
      return { success: false, error: 'Failed to cancel invitation' };
    }
  }

  /**
   * Cleanup expired invitations
   */
  static async cleanupExpiredInvitations(): Promise<number> {
    try {
      return await Invitation.cleanupExpiredInvitations();
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      return 0;
    }
  }

  /**
   * Get invitation statistics
   */
  static async getInvitationStats(): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
  }> {
    try {
      const [total, pending, accepted, expired] = await Promise.all([
        Invitation.countDocuments(),
        Invitation.countDocuments({ status: 'pending' }),
        Invitation.countDocuments({ status: 'accepted' }),
        Invitation.countDocuments({ status: 'expired' })
      ]);

      return { total, pending, accepted, expired };
    } catch (error) {
      console.error('Error getting invitation stats:', error);
      return { total: 0, pending: 0, accepted: 0, expired: 0 };
    }
  }

  /**
   * Batch invite users
   */
  static async batchInviteUsers(
    invitations: Array<{
      email: string;
      roleId: Types.ObjectId | string;
    }>,
    invitedBy: Types.ObjectId | string,
    customMessage?: string
  ): Promise<{
    success: boolean;
    results: Array<{
      email: string;
      success: boolean;
      error?: string;
      invitationId?: string;
    }>;
  }> {
    const results = [];

    for (const invitation of invitations) {
      const result = await this.inviteUser(
        invitation.email,
        invitation.roleId,
        invitedBy,
        customMessage
      );

      results.push({
        email: invitation.email,
        success: result.success,
        error: result.error,
        invitationId: result.invitation?.id
      });
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      results
    };
  }
}