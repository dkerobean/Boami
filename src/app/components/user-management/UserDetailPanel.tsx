'use client';

import { useState, useEffect } from 'react';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: {
    id: string;
    name: string;
    description: string;
  };
  status: 'active' | 'pending' | 'disabled';
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: string;
  designation?: string;
  phone?: string;
  bio?: string;
  company?: string;
  depment?: string;
  lastLogin?: string;
  invitedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  invitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserDetailPanelProps {
  userId: string;
  onEdit: (user: User) => void;
  onStatusChange: (user: User, newStatus: 'active' | 'pending' | 'disabled') => void;
}

export default function UserDetailPanel({ userId, onEdit, onStatusChange }: UserDetailPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';

    if (status === 'active' && isActive) {
      return `${baseClasses} bg-green-100 text-green-800`;
    } else if (status === 'pending') {
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800`;
    }
  };

  const getStatusText = (status: string, isActive: boolean) => {
    if (status === 'active' && isActive) return 'Active';
    if (status === 'pending') return 'Pending';
    return 'Disabled';
  };

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (status === 'active' && isActive) {
      return <ShieldCheckIcon className="h-5 w-5 text-green-600" />;
    } else if (status === 'pending') {
      return <ClockIcon className="h-5 w-5 text-yellow-600" />;
    } else {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading user</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchUser}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-gray-500">
          Select a user to view details
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon(user.status, user.isActive)}
                <span className={getStatusBadge(user.status, user.isActive)}>
                  {getStatusText(user.status, user.isActive)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(user)}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Edit User
            </button>
            {user.status !== 'disabled' && (
              <button
                onClick={() => onStatusChange(user, 'disabled')}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Disable
              </button>
            )}
            {user.status === 'disabled' && (
              <button
                onClick={() => onStatusChange(user, 'active')}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Enable
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Role Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Role & Permissions</h3>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">{user.role.name}</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">{user.role.description}</p>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-900">{user.email}</span>
              {!user.isEmailVerified && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Not Verified
                </span>
              )}
            </div>
            {user.phone && (
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-900">{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Information */}
        {(user.designation || user.company || user.department) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Professional Information</h3>
            <div className="space-y-3">
              {user.designation && (
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-900">{user.designation}</span>
                </div>
              )}
              {user.company && (
                <div className="flex items-start space-x-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-900">{user.company}</p>
                    {user.department && (
                      <p className="text-xs text-gray-500">{user.department}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">About</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Account Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Account Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-900">Joined {formatDate(user.createdAt)}</span>
                {user.invitedBy && (
                  <p className="text-xs text-gray-500">
                    Invited by {user.invitedBy.firstName} {user.invitedBy.lastName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-900">
                Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
              </span>
            </div>
            {user.emailVerifiedAt && (
              <div className="flex items-center space-x-3">
                <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-900">
                  Email verified on {formatDate(user.emailVerifiedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Warnings */}
        {user.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Pending Invitation
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  This user has not yet accepted their invitation. They will not be able to access the system until they complete the setup process.
                </p>
              </div>
            </div>
          </div>
        )}

        {user.status === 'disabled' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Account Disabled
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  This user account has been disabled and cannot access the system.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}