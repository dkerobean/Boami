'use client';

import React from 'react';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  HomeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface PermissionDeniedErrorProps {
  title?: string;
  message?: string;
  requiredPermission?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  customActions?: React.ReactNode;
}

export default function PermissionDeniedError({
  title = 'Access Denied',
  message = 'You don\'t have permission to access this resource.',
  requiredPermission,
  showBackButton = true,
  showHomeButton = true,
  customActions
}: PermissionDeniedErrorProps) {
  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ShieldExclamationIcon className="mx-auto h-16 w-16 text-red-400" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>

          {requiredPermission && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Required Permission
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    <code className="bg-red-100 px-2 py-1 rounded text-xs">
                      {requiredPermission}
                    </code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {customActions || (
            <>
              {showBackButton && (
                <button
                  onClick={handleGoBack}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Go Back
                </button>
              )}

              {showHomeButton && (
                <Link
                  href="/dashboard"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              )}
            </>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact permission denied component for inline use
 */
interface InlinePermissionDeniedProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function InlinePermissionDenied({
  message = 'Access denied',
  size = 'md',
  showIcon = true
}: InlinePermissionDeniedProps) {
  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md ${sizeClasses[size]}`}>
      <div className="flex">
        {showIcon && (
          <ExclamationTriangleIcon className={`${iconSizes[size]} text-red-400 flex-shrink-0`} />
        )}
        <div className={showIcon ? 'ml-3' : ''}>
          <p className="text-red-800 font-medium">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Permission denied card component
 */
interface PermissionDeniedCardProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function PermissionDeniedCard({
  title = 'Access Restricted',
  message = 'You need additional permissions to view this content.',
  action
}: PermissionDeniedCardProps) {
  return (
    <div className="bg-white shadow-sm rounded-lg border">
      <div className="p-6 text-center">
        <ShieldExclamationIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}