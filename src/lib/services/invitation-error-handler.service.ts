import { Invitation } from '@/lib/database/models/Invitation';
import { User } from '@/lib/database/models/User';
import { UserInvitationService } from './user-invitation.service';

export interface InvitationError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  retryable: boolean;
  suggestedAction?: string;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
}

export class InvitationErrorHandler {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  };

  /**
   * Handles duplicate email invitation attempts
   */
  static async handleDuplicateEmailInvitation(
    email: string,
    newRoleId: string,
    invitedBy: string
  ): Promise<{
    action: 'resend' | 'update' | 'error';
    invitation?: any;
    error?: InvitationError;
  }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return {
          action: 'error',
          error: {
            code: 'USER_ALREADY_EXISTS',
            message: 'A user with this email address already exists',
            details: {
              userStatus: existingUser.status,
              canSignIn: existingUser.status === 'active'
            },
            recoverable: false,
            retryable: false,
            suggestedAction: existingUser.status === 'active' ? 'User should sign in' : 'Contact administrator'
          }
        };
      }

      // Find existing invitations for this email
      const existingInvitations = await Invitation.find({ email })
        .populate('role', 'name')
        .sort({ createdAt: -1 });

      if (existingInvitations.length === 0) {
        // No existing invitations, proceed normally
        return { action: 'resend' };
      }

      const latestInvitation = existingInvitations[0];

      // Check if there's a pending invitation
      const pendingInvitation = existingInvitations.find(
        inv => inv.status === 'pending' && new Date(inv.expiresAt) > new Date()
      );

      if (pendingInvitation) {
        // Check if it's for the same role
        if (pendingInvitation.role._id.toString() === newRoleId) {
          return {
            action: 'resend',
            invitation: pendingInvitation,
            error: {
              code: 'INVITATION_ALREADY_PENDING',
              message: 'A pending invitation already exists for this email and role',
              details: {
                existingInvitationId: pendingInvitation._id,
                expiresAt: pendingInvitation.expiresAt,
                roleName: pendingInvitation.role.name
              },
              recoverable: true,
              retryable: false,
              suggestedAction: 'Resend existing invitation'
            }
          };
        } else {
          // Different role, update the invitation
          return {
            action: 'update',
            invitation: pendingInvitation,
            error: {
              code: 'INVITATION_ROLE_CONFLICT',
              message: 'A pending invitation exists for this email with a different role',
              details: {
                existingRole: pendingInvitation.role.name,
                newRoleId: newRoleId,
                canUpdate: true
              },
              recoverable: true,
              retryable: false,
              suggestedAction: 'Update invitation with new role'
            }
          };
        }
      }

      // Check for recently expired invitations
      const recentlyExpired = existingInvitations.find(
        inv => inv.status === 'expired' &&
        new Date().getTime() - new Date(inv.expiresAt).getTime() < (24 * 60 * 60 * 1000) // Within 24 hours
      );

      if (recentlyExpired) {
        return {
          action: 'resend',
          invitation: recentlyExpired,
          error: {
            code: 'INVITATION_RECENTLY_EXPIRED',
            message: 'A recent invitation for this email has expired',
            details: {
              expiredAt: recentlyExpired.expiresAt,
              roleName: recentlyExpired.role.name,
              canResend: true
            },
            recoverable: true,
            retryable: false,
            suggestedAction: 'Send new invitation'
          }
        };
      }

      // Default to resend for other cases
      return { action: 'resend' };

    } catch (error) {
      console.error('Error handling duplicate email invitation:', error);
      return {
        action: 'error',
        error: {
          code: 'DUPLICATE_CHECK_FAILED',
          message: 'Failed to check for duplicate invitations',
          recoverable: true,
          retryable: true,
          suggestedAction: 'Try again'
        }
      };
    }
  }

  /**
   * Handles expired invitation scenarios
   */
  static async handleExpiredInvitation(
    invitationId: string
  ): Promise<{
    canRenew: boolean;
    newInvitation?: any;
    error?: InvitationError;
  }> {
    try {
      const invitation = await Invitation.findById(invitationId)
        .populate('role')
        .populate('invitedBy');

      if (!invitation) {
        return {
          canRenew: false,
          error: {
            code: 'INVITATION_NOT_FOUND',
            message: 'Invitation not found',
            recoverable: false,
            retryable: false
          }
        };
      }

      // Check if invitation is actually expired
      if (new Date(invitation.expiresAt) > new Date()) {
        return {
          canRenew: false,
          error: {
            code: 'INVITATION_NOT_EXPIRED',
            message: 'Invitation is still valid',
            recoverable: false,
            retryable: false
          }
        };
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: invitation.email });
      if (existingUser) {
        return {
          canRenew: false,
          error: {
            code: 'USER_ALREADY_EXISTS',
            message: 'User account already exists for this email',
            recoverable: false,
            retryable: false,
            suggestedAction: 'User should sign in'
          }
        };
      }

      // Check if role still exists
      if (!invitation.role) {
        return {
          canRenew: false,
          error: {
            code: 'ROLE_NO_LONGER_EXISTS',
            message: 'The role associated with this invitation no longer exists',
            recoverable: false,
            retryable: false,
            suggestedAction: 'Contact administrator for new role assignment'
          }
        };
      }

      // Check if inviter is still active
      if (!invitation.invitedBy || invitation.invitedBy.status !== 'active') {
        return {
          canRenew: false,
          error: {
            code: 'INVITER_NO_LONGER_ACTIVE',
            message: 'The user who sent this invitation is no longer active',
            recoverable: false,
            retryable: false,
            suggestedAction: 'Contact administrator for new invitation'
          }
        };
      }

      // Create new invitation
      const invitationService = new UserInvitationService();
      const newInvitation = await invitationService.inviteUser(
        invitation.email,
        invitation.role._id.toString(),
        invitation.invitedBy._id.toString(),
        'Your previous invitation has expired. Here is a new invitation to join the platform.'
      );

      // Mark old invitation as replaced
      await Invitation.findByIdAndUpdate(invitationId, {
        status: 'replaced',
        replacedBy: newInvitation._id,
        replacedAt: new Date()
      });

      return {
        canRenew: true,
        newInvitation
      };

    } catch (error) {
      console.error('Error handling expired invitation:', error);
      return {
        canRenew: false,
        error: {
          code: 'RENEWAL_FAILED',
          message: 'Failed to renew invitation',
          recoverable: true,
          retryable: true,
          suggestedAction: 'Try again or contact administrator'
        }
      };
    }
  }

  /**
   * Implements retry mechanism for failed operations
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Calculate delay
        const delay = config.exponentialBackoff
          ? config.retryDelay * Math.pow(2, attempt)
          : config.retryDelay;

        console.warn(`Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`, lastError.message);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Determines if an error is retryable
   */
  private static isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'DATABASE_CONNECTION_ERROR',
      'EMAIL_SERVICE_ERROR',
      'TEMPORARY_ERROR'
    ];

    // Check error message for retryable patterns
    const errorMessage = error.message.toLowerCase();
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'temporary',
      'service unavailable',
      'rate limit'
    ];

    return retryableErrors.some(code => errorMessage.includes(code.toLowerCase())) ||
           retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Validates invitation before sending
   */
  static async validateInvitationRequest(
    email: string,
    roleId: string,
    invitedBy: string
  ): Promise<{
    isValid: boolean;
    error?: InvitationError;
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    try {
      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_EMAIL_FORMAT',
            message: 'Invalid email address format',
            recoverable: true,
            retryable: false,
            suggestedAction: 'Correct email format'
          }
        };
      }

      // Check for blocked domains (if applicable)
      const blockedDomains = ['tempmail.com', '10minutemail.com']; // Example blocked domains
      const emailDomain = email.split('@')[1].toLowerCase();
      if (blockedDomains.includes(emailDomain)) {
        return {
          isValid: false,
          error: {
            code: 'BLOCKED_EMAIL_DOMAIN',
            message: 'Email domain is not allowed',
            recoverable: true,
            retryable: false,
            suggestedAction: 'Use a different email address'
          }
        };
      }

      // Check role exists
      const Role = require('@/lib/database/models/Role').Role;
      const role = await Role.findById(roleId);
      if (!role) {
        return {
          isValid: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'Selected role does not exist',
            recoverable: false,
            retryable: false,
            suggestedAction: 'Select a valid role'
          }
        };
      }

      // Check inviter exists and is active
      const inviter = await User.findById(invitedBy);
      if (!inviter || inviter.status !== 'active') {
        return {
          isValid: false,
          error: {
            code: 'INVITER_INVALID',
            message: 'Inviter is not valid or active',
            recoverable: false,
            retryable: false,
            suggestedAction: 'Contact administrator'
          }
        };
      }

      // Check for recent invitation attempts (rate limiting)
      const recentInvitations = await Invitation.countDocuments({
        invitedBy: invitedBy,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });

      if (recentInvitations >= 10) { // Max 10 invitations per hour
        return {
          isValid: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many invitations sent recently',
            recoverable: true,
            retryable: true,
            suggestedAction: 'Wait before sending more invitations'
          }
        };
      }

      if (recentInvitations >= 5) {
        warnings.push('You are approaching the invitation rate limit');
      }

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('Error validating invitation request:', error);
      return {
        isValid: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate invitation request',
          recoverable: true,
          retryable: true,
          suggestedAction: 'Try again'
        }
      };
    }
  }

  /**
   * Logs invitation errors for monitoring
   */
  static logInvitationError(
    error: InvitationError,
    context: {
      email?: string;
      invitedBy?: string;
      operation: string;
      timestamp?: Date;
    }
  ): void {
    const logEntry = {
      ...context,
      error: {
        code: error.code,
        message: error.message,
        recoverable: error.recoverable,
        retryable: error.retryable
      },
      timestamp: context.timestamp || new Date()
    };

    // In a production environment, this would send to a logging service
    console.error('Invitation Error:', JSON.stringify(logEntry, null, 2));

    // Could also send to monitoring services like DataDog, New Relic, etc.
    // this.sendToMonitoring(logEntry);
  }

  /**
   * Gets user-friendly error message and suggested actions
   */
  static getErrorDisplay(error: InvitationError): {
    title: string;
    message: string;
    action?: string;
    actionType: 'primary' | 'secondary' | 'danger';
  } {
    const errorDisplays: { [key: string]: any } = {
      'USER_ALREADY_EXISTS': {
        title: 'User Already Exists',
        message: 'A user with this email address already has an account.',
        action: 'Go to Sign In',
        actionType: 'primary'
      },
      'INVITATION_ALREADY_PENDING': {
        title: 'Invitation Already Sent',
        message: 'A pending invitation has already been sent to this email address.',
        action: 'Resend Invitation',
        actionType: 'secondary'
      },
      'INVITATION_ROLE_CONFLICT': {
        title: 'Role Conflict',
        message: 'This user has a pending invitation for a different role.',
        action: 'Update Role',
        actionType: 'primary'
      },
      'INVITATION_RECENTLY_EXPIRED': {
        title: 'Invitation Expired',
        message: 'The previous invitation has expired recently.',
        action: 'Send New Invitation',
        actionType: 'primary'
      },
      'RATE_LIMIT_EXCEEDED': {
        title: 'Too Many Invitations',
        message: 'You have sent too many invitations recently. Please wait before sending more.',
        action: 'Try Again Later',
        actionType: 'secondary'
      },
      'INVALID_EMAIL_FORMAT': {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        action: 'Correct Email',
        actionType: 'primary'
      },
      'BLOCKED_EMAIL_DOMAIN': {
        title: 'Email Domain Not Allowed',
        message: 'This email domain is not permitted. Please use a different email address.',
        action: 'Use Different Email',
        actionType: 'primary'
      }
    };

    const display = errorDisplays[error.code] || {
      title: 'Error',
      message: error.message,
      action: error.suggestedAction,
      actionType: 'secondary'
    };

    return display;
  }
}