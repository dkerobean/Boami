'use client';

import { useSearchParams } from 'next/navigation';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  EnvelopeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function InvitationErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const email = searchParams.get('email');

  const getErrorDetails = (errorType: string | null) => {
    switch (errorType) {
      case 'expired':
        return {
          title: 'Invitation Expired',
          message: 'This invitation link has expired. Invitation links are valid for 48 hours.',
          icon: <ClockIcon className="h-12 w-12 text-yellow-400" />,
          color: 'yellow',
          showRequestNew: true
        };
      case 'invalid':
        return {
          title: 'Invalid Invitation',
          message: 'This invitation link is not valid or has been corrupted.',
          icon: <ExclamationTriangleIcon className="h-12 w-12 text-red-400" />,
          color: 'red',
          showRequestNew: false
        };
      case 'already-accepted':
        return {
          title: 'Invitation Already Used',
          message: 'This invitation has already been accepted and cannot be used again.',
          icon: <ExclamationTriangleIcon className="h-12 w-12 text-blue-400" />,
          color: 'blue',
          showRequestNew: false
        };
      case 'user-exists':
        return {
          title: 'Account Already Exists',
          message: 'A user account with this email address already exists.',
          icon: <ExclamationTriangleIcon className="h-12 w-12 text-orange-400" />,
          color: 'orange',
          showRequestNew: false
        };
      default:
        return {
          title: 'Invitation Error',
          message: 'There was a problem with your invitation link.',
          icon: <ExclamationTriangleIcon className="h-12 w-12 text-red-400" />,
          color: 'red',
          showRequestNew: false
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  const requestNewInvitation = async () => {
    if (!email) return;

    try {
      const response = await fetch('/api/invitations/request-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert('A new invitation has been sent to your email address.');
      } else {
        alert('Failed to request new invitation. Please contact an administrator.');
      }
    } catch (error) {
      alert('Failed to request new invitation. Please contact an administrator.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {errorDetails.icon}
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {errorDetails.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorDetails.message}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {email && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Email: {email}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {errorDetails.showRequestNew && email && (
              <button
                onClick={requestNewInvitation}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Request New Invitation
              </button>
            )}

            <div className="flex space-x-3">
              <a
                href="/auth/signin"
                className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Sign In
              </a>

              <a
                href="/contact"
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Contact Support
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              If you continue to experience issues, please contact your administrator or support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}