import { useState, useCallback } from 'react';

export interface InvitationValidationResult {
  isValid: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  invitation?: any;
}

export interface UseInvitationValidationReturn {
  validateInvitation: (token: string) => Promise<InvitationValidationResult>;
  validateMultipleInvitations: (tokens: string[]) => Promise<{ [token: string]: InvitationValidationResult }>;
  loading: boolean;
  error: string | null;
}

export function useInvitationValidation(): UseInvitationValidationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateInvitation = useCallback(async (token: string): Promise<InvitationValidationResult> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/invitations/validate/${token}`);

      if (!response.ok) {
        const errorData = await response.json();
        return {
          isValid: false,
          error: {
            code: errorData.code || 'UNKNOWN_ERROR',
            message: errorData.error || 'Validation failed',
            details: errorData.details
          }
        };
      }

      const invitationData = await response.json();

      return {
        isValid: true,
        invitation: invitationData,
        warnings: invitationData.validation?.warnings || []
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error during validation';
      setError(errorMessage);

      return {
        isValid: false,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage
        }
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const validateMultipleInvitations = useCallback(async (
    tokens: string[]
  ): Promise<{ [token: string]: InvitationValidationResult }> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/invitations/validate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens,
          options: {
            checkUserExists: true,
            checkRoleExists: true,
            checkInviterActive: true,
            updateExpiredStatus: false
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Batch validation failed');
      }

      const data = await response.json();
      return data.results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error during batch validation';
      setError(errorMessage);

      // Return error result for all tokens
      const errorResult: InvitationValidationResult = {
        isValid: false,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage
        }
      };

      return tokens.reduce((acc, token) => {
        acc[token] = errorResult;
        return acc;
      }, {} as { [token: string]: InvitationValidationResult });

    } finally {
      setLoading(false);
    }
  }, []);

  return {
    validateInvitation,
    validateMultipleInvitations,
    loading,
    error
  };
}

// Utility functions for working with validation results
export const InvitationValidationUtils = {
  /**
   * Checks if an error is recoverable (user can request new invitation)
   */
  isRecoverableError(error: { code: string }): boolean {
    return ['INVITATION_EXPIRED', 'INVITATION_CANCELLED'].includes(error.code);
  },

  /**
   * Checks if an error indicates the user should sign in instead
   */
  shouldRedirectToSignIn(error: { code: string }): boolean {
    return ['ALREADY_ACCEPTED', 'USER_EXISTS'].includes(error.code);
  },

  /**
   * Gets a user-friendly error message
   */
  getErrorMessage(error: { code: string; message: string }): string {
    const messages: { [key: string]: string } = {
      'INVITATION_EXPIRED': 'This invitation has expired. You can request a new one.',
      'ALREADY_ACCEPTED': 'This invitation has already been used. Please sign in to your account.',
      'USER_EXISTS': 'An account with this email already exists. Please sign in.',
      'TOKEN_NOT_FOUND': 'This invitation link is invalid.',
      'INVALID_TOKEN_FORMAT': 'This invitation link is malformed.',
      'ROLE_NOT_FOUND': 'The role for this invitation no longer exists. Contact an administrator.',
      'INVITER_INACTIVE': 'The person who sent this invitation is no longer active. Contact an administrator.',
      'INVITATION_CANCELLED': 'This invitation has been cancelled. Contact an administrator for a new one.',
      'NETWORK_ERROR': 'Network error. Please check your connection and try again.'
    };

    return messages[error.code] || error.message || 'An unknown error occurred.';
  },

  /**
   * Gets appropriate action text for an error
   */
  getErrorAction(error: { code: string }): string | null {
    const actions: { [key: string]: string } = {
      'INVITATION_EXPIRED': 'Request New Invitation',
      'INVITATION_CANCELLED': 'Request New Invitation',
      'ALREADY_ACCEPTED': 'Sign In',
      'USER_EXISTS': 'Sign In',
      'NETWORK_ERROR': 'Try Again'
    };

    return actions[error.code] || null;
  }
};