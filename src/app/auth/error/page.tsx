'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Configuration Error',
    description: 'There is a problem with the server configuration. Please contact support.'
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in.'
  },
  Verification: {
    title: 'Verification Error',
    description: 'The verification token has expired or has already been used.'
  },
  Default: {
    title: 'Authentication Error',
    description: 'An error occurred during authentication. Please try again.'
  },
  Signin: {
    title: 'Sign In Error',
    description: 'There was an error signing you in. Please check your credentials and try again.'
  },
  OAuthSignin: {
    title: 'OAuth Sign In Error',
    description: 'Error in retrieving authentication details from OAuth provider.'
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    description: 'Error in handling the response from OAuth provider.'
  },
  OAuthCreateAccount: {
    title: 'OAuth Account Creation Error',
    description: 'Could not create OAuth account in the database.'
  },
  EmailCreateAccount: {
    title: 'Email Account Creation Error',
    description: 'Could not create email account in the database.'
  },
  Callback: {
    title: 'Callback Error',
    description: 'Error in the OAuth callback handler route.'
  },
  OAuthAccountNotLinked: {
    title: 'OAuth Account Not Linked',
    description: 'To confirm your identity, sign in with the same account you used originally.'
  },
  EmailSignin: {
    title: 'Email Sign In Error',
    description: 'The e-mail could not be sent.'
  },
  CredentialsSignin: {
    title: 'Invalid Credentials',
    description: 'The credentials you provided are incorrect. Please check your email and password.'
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'You must be signed in to view this page.'
  }
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              {errorInfo.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {errorInfo.description}
            </p>

            {error === 'Configuration' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  This usually means there's an issue with environment variables or database connection.
                  Please check your configuration and try again.
                </p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Link
                href="/auth/auth1/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </Link>

              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go Home
              </Link>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs text-gray-500">
                  <strong>Debug Info:</strong> Error code: {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}