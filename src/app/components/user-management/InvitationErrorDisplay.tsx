'use client';

import { useState } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  UserPlusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface InvitationError {
  code: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  display?: {
    title: string;
    message: string;
    action?: string;
    actionType: 'primary' | 'secondary' | 'danger';
  };
}

interface InvitationErrorDisplayProps {
  error: InvitationError;
  email?: string;
  onRetry?: () => void;
  onResend?: () => void;
  onUpdate?: () => void;
  onSignIn?: () => void;
  onDismiss?: () => void;
  loading?: boolean;
}

export default function InvitationErrorDisplay({
  error,
  email,
  onRetry,
  onResend,
  onUpdate,
  onSignIn,
  onDismiss,
  loading = false
}: InvitationErrorDisplayProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getErrorIcon = () => {
    switch (error.code) {
      case 'USER_ALREADY_EXISTS':
      case 'ALREADY_ACCEPTED':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      case 'INVITATION_ALREADY_PENDING':
      case 'INVITATION_RECENTLY_EXPIRED':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'RATE_LIMIT_EXCEEDED':
      case 'BLOCKED_EMAIL_DOMAIN':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'INVITATION_ROLE_CONFLICT':
        return <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />;
      default:
        return <ExclamationTriangleIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (error.code) {
      case 'USER_ALREADY_EXISTS':
      case 'ALREADY_ACCEPTED':
        return 'bg-blue-50 border-blue-200';
      case 'INVITATION_ALREADY_PENDING':
      case 'INVITATION_RECENTLY_EXPIRED':
        return 'bg-yellow-50 border-yellow-200';
      case 'RATE_LIMIT_EXCEEDED':
      case 'BLOCKED_EMAIL_DOMAIN':
        return 'bg-red-50 border-red-200';
      case 'INVITATION_ROLE_CONFLICT':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getActionButton = () => {
    if (loading) {
      return (
        <button
          disabled
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </button>
      );
    }

    switch (error.code) {
      case 'USER_ALREADY_EXISTS':
      case 'ALREADY_ACCEPTED':
        return onSignIn ? (
          <button
            onClick={onSignIn}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            Go to Sign In
          </button>
        ) : null;

      case 'INVITATION_ALREADY_PENDING':
        return onResend ? (
          <button
            onClick={onResend}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Resend Invitation
          </button>
        ) : null;

      case 'INVITATION_ROLE_CONFLICT':
        return onUpdate ? (
          <button
            onClick={onUpdate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Update Role
          </button>
        ) : null;

      case 'INVITATION_RECENTLY_EXPIRED':
        return onResend ? (
          <button
            onClick={onResend}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Send New Invitation
          </button>
        ) : null;

      case 'RATE_LIMIT_EXCEEDED':
        return (
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
          >
            Try Again Later
          </button>
        );

      default:
        return error.retryable && onRetry ? (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        ) : null;
    }
  };

  const display = error.display || {
    title: 'Error',
    message: error.message,
    actionType: 'secondary' as const
  };

  return (
    <div className={`rounded-md border p-4 ${getBackgroundColor()}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            {display.title}
          </h3>
          <div className="mt-2 text-sm text-gray-700">
            <p>{display.message}</p>
            {email && (
              <p className="mt-1 text-xs text-gray-500">
                Email: {email}
              </p>
            )}
          </div>

          {(getActionButton() || error.recoverable) && (
            <div className="mt-4 flex items-center space-x-3">
              {getActionButton()}

              {error.recoverable && (
                <button
                  onClick={handleDismiss}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {!error.recoverable && (
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for displaying multiple errors
interface InvitationErrorListProps {
  errors: Array<{
    id: string;
    error: InvitationError;
    email?: string;
  }>;
  onRetry?: (id: string) => void;
  onResend?: (id: string) => void;
  onUpdate?: (id: string) => void;
  onSignIn?: (id: string) => void;
  onDismiss?: (id: string) => void;
  loading?: string[]; // Array of IDs that are currently loading
}

export function InvitationErrorList({
  errors,
  onRetry,
  onResend,
  onUpdate,
  onSignIn,
  onDismiss,
  loading = []
}: InvitationErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {errors.map(({ id, error, email }) => (
        <InvitationErrorDisplay
          key={id}
          error={error}
          email={email}
          onRetry={() => onRetry?.(id)}
          onResend={() => onResend?.(id)}
          onUpdate={() => onUpdate?.(id)}
          onSignIn={() => onSignIn?.(id)}
          onDismiss={() => onDismiss?.(id)}
          loading={loading.includes(id)}
        />
      ))}
    </div>
  );
}

// Hook for managing invitation errors
export function useInvitationErrors() {
  const [errors, setErrors] = useState<Array<{
    id: string;
    error: InvitationError;
    email?: string;
  }>>([]);

  const addError = (error: InvitationError, email?: string) => {
    const id = Date.now().toString();
    setErrors(prev => [...prev, { id, error, email }]);
    return id;
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return {
    errors,
    addError,
    removeError,
    clearErrors
  };
}