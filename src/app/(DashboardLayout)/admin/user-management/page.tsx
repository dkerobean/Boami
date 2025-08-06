'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  PlusIcon,
  UsersIcon,
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { usePermission } from '@/lib/hooks/usePermissions';
import UserListTable from '@/app/components/user-management/UserListTable';
import UserInviteModal from '@/app/components/user-management/UserInviteModal';
import UserEditModal from '@/app/components/user-management/UserEditModal';
import UserDetailPanel from '@/app/components/user-management/UserDetailPanel';
import RoleManagementPanel from '@/app/components/user-management/RoleManagementPanel';

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

interface UserStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    disabledUsers: number;
    recentUsers: number;
  };
  percentages: {
    activePercentage: number;
    verifiedPercentage: number;
    pendingPercentage: number;
  };
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  }>>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Permission checks
  const { hasPermission: canReadUsers, loading: canReadUsersLoading } = usePermission('users', 'read');
  const { hasPermission: canCreateUsers } = usePermission('users', 'create');
  const { hasPermission: canUpdateUsers } = usePermission('users', 'update');
  const { hasPermission: canDeleteUsers } = usePermission('users', 'delete');
  const { hasPermission: canReadRoles } = usePermission('roles', 'read');
  const { hasPermission: canCreateRoles } = usePermission('roles', 'create');
  const { hasPermission: canUpdateRoles } = usePermission('roles', 'update');
  const { hasPermission: canDeleteRoles } = usePermission('roles', 'delete');

  // Notification helpers
  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Error handling helpers
  const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    const message = error instanceof Error ? error.message : `Failed to ${context}`;
    addNotification('error', message);
    setGlobalError(message);
  };

  const clearError = () => {
    setGlobalError(null);
  };

  // Retry mechanism
  const retryOperation = (operation: () => Promise<void>) => {
    setRetryCount(prev => prev + 1);
    clearError();
    operation().catch(error => {
      if (retryCount < 3) {
        setTimeout(() => retryOperation(operation), 1000 * Math.pow(2, retryCount));
      } else {
        handleError(error, 'retry operation');
      }
    });
  };

  // Fetch user statistics
  const fetchUserStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      clearError();
      const response = await fetch('/api/users/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch user statistics');
      }

      const stats = await response.json();
      setUserStats(stats);
    } catch (error) {
      handleError(error, 'fetch user statistics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load stats on component mount
  useEffect(() => {
    if (canReadUsers) {
      fetchUserStats();
    }
  }, [canReadUsers, fetchUserStats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open invite modal
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (canCreateUsers && !operationLoading) {
          setShowInviteModal(true);
        }
      }

      // Cmd/Ctrl + R to refresh
      if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
        event.preventDefault();
        if (!operationLoading && !statsLoading) {
          setRefreshTrigger(prev => prev + 1);
          fetchUserStats();
        }
      }

      // Escape to close modals
      if (event.key === 'Escape') {
        setShowInviteModal(false);
        setShowEditModal(false);
        setSelectedUserId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canCreateUsers, operationLoading, statsLoading, fetchUserStats]);

  // Auto-refresh data periodically
  useEffect(() => {
    if (!canReadUsers) return;

    const interval = setInterval(() => {
      if (!operationLoading && !statsLoading) {
        fetchUserStats();
        setRefreshTrigger(prev => prev + 1);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [canReadUsers, operationLoading, statsLoading, fetchUserStats]);

  const handleInviteUsers = async (invitations: Array<{ email: string; roleId: string }>, customMessage?: string) => {
    try {
      setOperationLoading(true);
      clearError();

      const promises = invitations.map(async (invitation) => {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: invitation.email,
            roleId: invitation.roleId,
            customMessage
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to invite ${invitation.email}`);
        }

        return response.json();
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      if (successful.length > 0) {
        setRefreshTrigger(prev => prev + 1);
        await fetchUserStats();
        addNotification('success', `Successfully sent ${successful.length} invitation${successful.length !== 1 ? 's' : ''}`);
      }

      if (failed.length > 0) {
        const errorMessages = failed.map(result =>
          result.status === 'rejected' ? result.reason.message : 'Unknown error'
        );
        addNotification('error', `${failed.length} invitation${failed.length !== 1 ? 's' : ''} failed: ${errorMessages.join(', ')}`);

        if (successful.length === 0) {
          throw new Error(`All ${failed.length} invitation(s) failed to send`);
        }
      }
    } catch (error) {
      handleError(error, 'send invitations');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      setOperationLoading(true);
      clearError();

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const updatedUser = await response.json();
      setRefreshTrigger(prev => prev + 1);
      await fetchUserStats();
      addNotification('success', 'User updated successfully');

      // Update selected user if it's the one being edited
      if (selectedUserId === userId) {
        setSelectedUser(updatedUser);
      }
    } catch (error) {
      handleError(error, 'update user');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to disable ${user.name}? This action can be reversed later.`)) {
      return;
    }

    try {
      setOperationLoading(true);
      clearError();

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disable user');
      }

      setRefreshTrigger(prev => prev + 1);
      await fetchUserStats();
      addNotification('success', `${user.name} has been disabled`);

      // Clear selection if the disabled user was selected
      if (selectedUserId === user.id) {
        setSelectedUserId(null);
      }
    } catch (error) {
      handleError(error, 'disable user');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleResendInvitation = async (user: User) => {
    try {
      setOperationLoading(true);
      clearError();

      const response = await fetch(`/api/invitations/${user.id}/resend`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend invitation');
      }

      addNotification('success', `Invitation resent to ${user.email}`);
    } catch (error) {
      handleError(error, 'resend invitation');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleStatusChange = async (user: User, newStatus: 'active' | 'pending' | 'disabled') => {
    try {
      setOperationLoading(true);
      clearError();

      const response = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user status');
      }

      setRefreshTrigger(prev => prev + 1);
      await fetchUserStats();

      const statusText = newStatus === 'active' ? 'activated' :
                        newStatus === 'disabled' ? 'disabled' : 'set to pending';
      addNotification('success', `${user.name} has been ${statusText}`);
    } catch (error) {
      handleError(error, 'update user status');
    } finally {
      setOperationLoading(false);
    }
  };

  // Role management handlers
  const handleCreateRole = async (roleData: { name: string; description: string; permissions: string[] }) => {
    try {
      setOperationLoading(true);
      clearError();

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create role');
      }

      const newRole = await response.json();
      setRefreshTrigger(prev => prev + 1);
      addNotification('success', `Role "${newRole.name}" created successfully`);
    } catch (error) {
      handleError(error, 'create role');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateRole = async (roleId: string, updates: { name?: string; description?: string; permissions?: string[] }) => {
    try {
      setOperationLoading(true);
      clearError();

      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      const updatedRole = await response.json();
      setRefreshTrigger(prev => prev + 1);
      addNotification('success', `Role "${updatedRole.name}" updated successfully`);
    } catch (error) {
      handleError(error, 'update role');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      setOperationLoading(true);
      clearError();

      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }

      setRefreshTrigger(prev => prev + 1);
      addNotification('success', 'Role deleted successfully');
    } catch (error) {
      handleError(error, 'delete role');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  // Check if user has access to this page
  if (!canReadUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-2 text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to access user management.
          </p>
        </div>
      </div>
    );
  }

  if (canReadUsersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Something went wrong
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{globalError}</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    onClick={() => retryOperation(fetchUserStats)}
                    className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                  >
                    Retry
                  </button>
                  <button
                    onClick={clearError}
                    className="ml-3 bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage users, roles, and permissions for your organization
              </p>
              <div className="mt-2 text-xs text-gray-400">
                <span className="inline-flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">K</kbd>
                  <span>to invite users</span>
                </span>
                <span className="ml-4 inline-flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">R</kbd>
                  <span>to refresh</span>
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setRefreshTrigger(prev => prev + 1);
                  fetchUserStats();
                }}
                disabled={operationLoading || statsLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`h-4 w-4 mr-2 ${(operationLoading || statsLoading) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              {canCreateUsers && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  disabled={operationLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Invite Users
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UsersIcon className="h-4 w-4" />
                <span>Users</span>
              </div>
            </button>
            {canReadRoles && (
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>Roles & Permissions</span>
                </div>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Statistics Cards */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading ? (
            // Loading skeleton for stats
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow-sm rounded-lg border">
                <div className="p-5">
                  <div className="animate-pulse flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-6 w-6 bg-gray-200 rounded"></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : userStats ? (
            <>
              <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UsersIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Users
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {userStats.overview.totalUsers}
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
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-green-600"></div>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Active Users
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {userStats.overview.activeUsers}
                          <span className="text-sm text-green-600 ml-2">
                            ({userStats.percentages.activePercentage}%)
                          </span>
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
                      <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-yellow-600"></div>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Pending Invitations
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {userStats.overview.pendingUsers}
                          <span className="text-sm text-yellow-600 ml-2">
                            ({userStats.percentages.pendingPercentage}%)
                          </span>
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
                      <ChartBarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          New This Month
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {userStats.overview.recentUsers}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Error state for stats
            <div className="col-span-full bg-white overflow-hidden shadow-sm rounded-lg border">
              <div className="p-5 text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load statistics</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There was a problem loading the user statistics.
                </p>
                <button
                  onClick={() => retryOperation(fetchUserStats)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Table */}
        <div className="lg:col-span-2">
          {activeTab === 'users' && (
            <UserListTable
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onResendInvitation={handleResendInvitation}
              onSelectUser={(user) => setSelectedUserId(user.id)}
              selectedUserId={selectedUserId}
              refreshTrigger={refreshTrigger}
            />
          )}
          {activeTab === 'roles' && (
            <RoleManagementPanel
              onCreateRole={handleCreateRole}
              onUpdateRole={handleUpdateRole}
              onDeleteRole={handleDeleteRole}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>

        {/* User Detail Panel */}
        <div className="lg:col-span-1">
          {selectedUserId ? (
            <UserDetailPanel
              userId={selectedUserId}
              onEdit={handleEditUser}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a User</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a user from the table to view their details and manage their account
                </p>
              </div>
            </div>
          )}
        </div>
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
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <p className={`text-sm font-medium ${
                      notification.type === 'success' ? 'text-green-800' :
                      notification.type === 'error' ? 'text-red-800' :
                      'text-blue-800'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                      className={`rounded-md inline-flex ${
                        notification.type === 'success' ? 'text-green-400 hover:text-green-500' :
                        notification.type === 'error' ? 'text-red-400 hover:text-red-500' :
                        'text-blue-400 hover:text-blue-500'
                      } focus:outline-none`}
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Loading Overlay */}
      {operationLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-900">Processing...</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <UserInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUsers}
      />

      <UserEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        onUpdate={handleUpdateUser}
      />
    </div>
  );
}