import { Invitation } from '@/lib/database/models/Invitation';
import { User } from '@/lib/database/models/User';

export interface ValidationResult {
  isValid: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  invitation?: any;
}

export interface InvitationValidationOptions {
  checkUserExists?: boolean;
  checkRoleExists?: boolean;
  checkInviterActive?: boolean;
  updateExpiredStatus?: boolean;
}

export class InvitationValidator {
  private static readonly TOKEN_MIN_LENGTH = 32;
  private static readonly TOKEN_PATTERN = /^[a-zA-Z0-9\-_]+$/;
  private static readonly EXPIRY_WARNING_HOURS = 24;

  /**
   * Validates an invitation token comprehensively
   */
  static async validateInvitation(
    token: string,
    options: InvitationValidationOptions = {}
  ): Promise<ValidationResult> {
    const {
      checkUserExists = true,
      checkRoleExists = true,
      checkInviterActive = true,
      updateExpiredStatus = true
    } = options;

    try {
      // Step 1: Validate token format
      const tokenValidation = this.validateTokenFormat(token);
      if (!tokenValidation.isValid) {
        return tokenValidation;
      }

      // Step 2: Find invitation in database
      const invitation = await Invitation.findOne({ token })
        .populate('role', 'name description isSystem')
        .populate('invitedBy', 'firstName lastName email status')
        .lean();

      if (!invitation) {
        return {
          isValid: false,
          error: {
            code: 'TOKEN_NOT_FOUND',
            message: 'Invalid invitation token'
          }
        };
      }

      // Step 3: Check role validity
      if (checkRoleExists && !invitation.role) {
        return {
          isValid: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'The role associated with this invitation no longer exists'
          }
        };
      }

      // Step 4: Check inviter status
      if (checkInviterActive && (!invitation.invitedBy || invitation.invitedBy.status === 'disabled')) {
        return {
          isValid: false,
          error: {
            code: 'INVITER_INACTIVE',
            message: 'The user who sent this invitation is no longer active'
          }
        };
      }

      // Step 5: Check expiration
      const expirationCheck = await this.checkExpiration(invitation, updateExpiredStatus);
      if (!expirationCheck.isValid) {
        return expirationCheck;
      }

      // Step 6: Check invitation status
      const statusCheck = this.checkInvitationStatus(invitation);
      if (!statusCheck.isValid) {
        return statusCheck;
      }

      // Step 7: Check if user already exists
      if (checkUserExists) {
        const userExistsCheck = await this.checkUserExists(invitation.email);
        if (!userExistsCheck.isValid) {
          return userExistsCheck;
        }
      }
      
      // Step 8: Check for warnings
      const warnings = this.getValidationWarnings(invitation);

      return {
        isValid: true,
        warnings,
        invitation: this.formatInvitationData(invitation)
      };

    } catch (error) {
      console.error('Error validating invitation:', error);

      if (error.name === 'CastError') {
        return {
          isValid: false,
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Invalid invitation token format'
          }
        };
      }

      return {
        isValid: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during validation'
        }
      };
    }
  }

  /**
   * Validates token format
   */
  private static validateTokenFormat(token: string): ValidationResult {
    if (!token) {
      return {
        isValid: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Invitation token is required'
        }
      };
    }

    if (token.length < this.TOKEN_MIN_LENGTH || !this.TOKEN_PATTERN.test(token)) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid invitation token format'
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Checks if invitation has expired
   */
  private static async checkExpiration(invitation: any, updateStatus: boolean): Promise<ValidationResult> {
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);

    if (expiresAt < now) {
      if (updateStatus) {
        await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      }

      const hoursExpired = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60));

      return {
        isValid: false,
        error: {
          code: 'INVITATION_EXPIRED',
          message: 'This invitation has expired',
          details: {
            expiredAt: invitation.expiresAt,
            hoursExpired,
            canRequestNew: true
          }
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Checks invitation status
   */
  private static checkInvitationStatus(invitation: any): ValidationResult {
    if (invitation.status === 'accepted') {
      return {
        isValid: false,
        error: {
          code: 'ALREADY_ACCEPTED',
          message: 'This invitation has already been accepted',
          details: {
            acceptedAt: invitation.acceptedAt
          }
        }
      };
    }

    if (invitation.status === 'cancelled' || invitation.status === 'revoked') {
      return {
        isValid: false,
        error: {
          code: 'INVITATION_CANCELLED',
          message: 'This invitation has been cancelled'
        }
      };
    }

    if (invitation.status === 'expired') {
      return {
        isValid: false,
        error: {
          code: 'INVITATION_EXPIRED',
          message: 'This invitation has expired',
          details: {
            canRequestNew: true
          }
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Checks if user already exists
   */
  private static async checkUserExists(email: string): Promise<ValidationResult> {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return {
        isValid: false,
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email address already exists',
          details: {
            userStatus: existingUser.status,
            canSignIn: existingUser.status === 'active'
          }
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Gets validation warnings
   */
  private static getValidationWarnings(invitation: any): string[] {
    const warnings: string[] = [];
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    const hoursUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursUntilExpiry <= this.EXPIRY_WARNING_HOURS) {
      warnings.push(`This invitation will expire in ${hoursUntilExpiry} hour${hoursUntilExpiry !== 1 ? 's' : ''}`);
    }

    return warnings;
  }

  /**
   * Formats invitation data for response
   */
  private static formatInvitationData(invitation: any) {
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    const hoursUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    const isExpiringSoon = hoursUntilExpiry <= this.EXPIRY_WARNING_HOURS;

    return {
      id: invitation._id,
      email: invitation.email,
      role: {
        id: invitation.role._id,
        name: invitation.role.name,
        description: invitation.role.description,
        isSystem: invitation.role.isSystem
      },
      invitedBy: {
        firstName: invitation.invitedBy.firstName,
        lastName: invitation.invitedBy.lastName,
        email: invitation.invitedBy.email
      },
      expiresAt: invitation.expiresAt,
      status: invitation.status,
      createdAt: invitation.createdAt,
      validation: {
        isValid: true,
        isExpiringSoon,
        hoursUntilExpiry,
        warnings: isExpiringSoon ? [`This invitation will expire in ${hoursUntilExpiry} hour${hoursUntilExpiry !== 1 ? 's' : ''}`] : []
      }
    };
  }

  /**
   * Validates multiple invitations at once
   */
  static async validateMultipleInvitations(
    tokens: string[],
    options: InvitationValidationOptions = {}
  ): Promise<{ [token: string]: ValidationResult }> {
    const results: { [token: string]: ValidationResult } = {};

    await Promise.all(
      tokens.map(async (token) => {
        results[token] = await this.validateInvitation(token, options);
      })
    );

    return results;
  }

  /**
   * Gets invitation statistics for monitoring
   */
  static async getInvitationStats(): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    cancelled: number;
    expiringSoon: number;
  }> {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    const [
      total,
      pending,
      accepted,
      expired,
      cancelled,
      expiringSoon
    ] = await Promise.all([
      Invitation.countDocuments(),
      Invitation.countDocuments({ status: 'pending' }),
      Invitation.countDocuments({ status: 'accepted' }),
      Invitation.countDocuments({ status: 'expired' }),
      Invitation.countDocuments({ status: 'cancelled' }),
      Invitation.countDocuments({
        status: 'pending',
        expiresAt: { $lte: twentyFourHoursFromNow, $gt: now }
      })
    ]);

    return {
      total,
      pending,
      accepted,
      expired,
      cancelled,
      expiringSoon
    };
  }
}