'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  PlusIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { usePermission } from '@/lib/hooks/usePermissions';
import RoleManagementPanel from '@/app/components/user-management/RoleManagementPanel';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoleStats {
  overview: {
    totalRoles: number;
    customRoles: number;
    systemRoles: number;
    totalPermissions: number;
  };
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleStats, setRoleStats] = useState<RoleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  }>>([]);

  // Permission checks
  const canManageRoles = usePermission('roles', 'manage');
  const canViewRoles = usePermission('roles', 'view');

  // Notification helper
  const addNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Fetch role statistics
  const fetchRoleStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/roles/stats');
      if (!response.ok) throw new Error('Failed to fetch role statistics');

      const data = await response.json();
      if (data.success) {
        setRoleStats(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch role statistics');
      }
    } catch (error: any) {
      console.error('Error fetching role stats:', error);
      setError(error.message);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (!canViewRoles.hasPermission) {
        setError('You do not have permission to view roles');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchRoleStats()
        ]);
      } catch (error: any) {
        console.error('Error initializing role management:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [canViewRoles.hasPermission, fetchRoleStats, refreshTrigger]);

  // Role management handlers
  const handleCreateRole = async (roleData: { name: string; description: string; permissions: string[] }) => {
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
      });

      const data = await response.json();
      if (data.success) {
        addNotification('success', `Role "${roleData.name}" created successfully`);
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(data.error || 'Failed to create role');
      }
    } catch (error: any) {
      console.error('Error creating role:', error);
      addNotification('error', error.message);
    }
  };

  const handleUpdateRole = async (roleId: string, updates: { name?: string; description?: string; permissions?: string[] }) => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.success) {
        addNotification('success', 'Role updated successfully');
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (error: any) {
      console.error('Error updating role:', error);
      addNotification('error', error.message);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        addNotification('success', 'Role deleted successfully');
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(data.error || 'Failed to delete role');
      }
    } catch (error: any) {
      console.error('Error deleting role:', error);
      addNotification('error', error.message);
    }
  };

  // Retry operation helper
  const retryOperation = (operation: () => Promise<void>) => {
    operation().catch(console.error);
  };

  // Permission denied state
  if (!canViewRoles.loading && !canViewRoles.hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
              <h2 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h2>
              <p className="mt-2 text-sm text-gray-600">
                You don't have permission to access role management.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm border rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage roles and permissions for your organization
              </p>
            </div>
            {canManageRoles.hasPermission && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {!loading && roleStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Roles
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {roleStats.overview.totalRoles}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Custom Roles
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {roleStats.overview.customRoles}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      System Roles
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {roleStats.overview.systemRoles}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Permissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {roleStats.overview.totalPermissions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white shadow-sm border rounded-lg">
        <RoleManagementPanel
          onCreateRole={handleCreateRole}
          onUpdateRole={handleUpdateRole}
          onDeleteRole={handleDeleteRole}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
                notification.type === 'success' ? 'bg-green-50 border-green-200' :
                notification.type === 'error' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {notification.type === 'success' && (
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {notification.type === 'error' && (
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    {notification.type === 'info' && (
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className={`text-sm font-medium ${
                      notification.type === 'success' ? 'text-green-900' :
                      notification.type === 'error' ? 'text-red-900' :
                      'text-blue-900'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className={`rounded-md inline-flex ${
                        notification.type === 'success' ? 'text-green-400 hover:text-green-500' :
                        notification.type === 'error' ? 'text-red-400 hover:text-red-500' :
                        'text-blue-400 hover:text-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        notification.type === 'success' ? 'focus:ring-green-500' :
                        notification.type === 'error' ? 'focus:ring-red-500' :
                        'focus:ring-blue-500'
                      }`}
                      onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}