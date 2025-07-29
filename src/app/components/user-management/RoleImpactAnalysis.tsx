'use client';

import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UsersIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount?: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  lastLogin?: string;
  status: 'active' | 'pending' | 'disabled';
}

interface PermissionChange {
  permission: Permission;
  type: 'added' | 'removed';
}

interface RoleImpactAnalysisProps {
  role: Role;
  newPermissions: string[];
  allPermissions: Permission[];
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function RoleImpactAnalysis({
  role,
  newPermissions,
  allPermissions,
  onClose,
  onConfirm,
  loading = false
}: RoleImpactAnalysisProps) {
  const [affectedUsers, setAffectedUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const currentPermissionIds = role.permissions.map(p => p.id);
  const permissionChanges: PermissionChange[] = [];

  // Find added permissions
  newPermissions.forEach(permId => {
    if (!currentPermissionIds.includes(permId)) {
      const permission = allPermissions.find(p => p.id === permId);
      if (permission) {
        permissionChanges.push({ permission, type: 'added' });
      }
    }
  });

  // Find removed permissions
  currentPermissionIds.forEach(permId => {
    if (!newPermissions.includes(permId)) {
      const permission = allPermissions.find(p => p.id === permId);
      if (permission) {
        permissionChanges.push({ permission, type: 'removed' });
      }
    }
  });

  const addedPermissions = permissionChanges.filter(c => c.type === 'added');
  const removedPermissions = permissionChanges.filter(c => c.type === 'removed');

  useEffect(() => {
    fetchAffectedUsers();
  }, [role.id]);

  const fetchAffectedUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/users?roleId=${role.id}&includeRole=true`);

      if (response.ok) {
        const data = await response.json();
        setAffectedUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching affected users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const getSeverityLevel = (): 'low' | 'medium' | 'high' => {
    if (removedPermissions.length > 0) {
      return 'high';
    }
    if (addedPermissions.length > 3 || (role.userCount || 0) > 10) {
      return 'medium';
    }
    return 'low';
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'medium':
        return <InformationCircleIcon className="h-5 w-5" />;
      case 'low':
        return <CheckCircleIcon className="h-5 w-5" />;
    }
  };

  const severity = getSeverityLevel();

  if (permissionChanges.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
          <div className="text-center">
            <InformationCircleIcon className="mx-auto h-12 w-12 text-blue-400" />
            <h3 className="text-lg font-medium text-gray-900 mt-2">No Changes Detected</h3>
            <p className="text-sm text-gray-500 mt-1">
              The selected permissions are identical to the current role permissions.
            </p>
            <div className="mt-4">
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Role Impact Analysis: {role.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Severity Alert */}
          <div className={`rounded-md border p-4 ${getSeverityColor(severity)}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {getSeverityIcon(severity)}
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">
                  {severity === 'high' && 'High Impact Changes'}
                  {severity === 'medium' && 'Medium Impact Changes'}
                  {severity === 'low' && 'Low Impact Changes'}
                </h3>
                <div className="mt-2 text-sm">
                  <p>
                    {severity === 'high' && 'These changes will remove permissions and may affect user access to critical features.'}
                    {severity === 'medium' && 'These changes will affect multiple users or add significant new permissions.'}
                    {severity === 'low' && 'These changes have minimal impact and are safe to apply.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Permission Changes */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Permission Changes</h4>

              {/* Added Permissions */}
              {addedPermissions.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center mb-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                    <h5 className="font-medium text-green-800">
                      Added Permissions ({addedPermissions.length})
                    </h5>
                  </div>
                  <div className="space-y-2">
                    {addedPermissions.map(({ permission }) => (
                      <div key={permission.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-green-800">
                            {permission.resource}.{permission.action}
                          </span>
                          <p className="text-xs text-green-600">{permission.description}</p>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 text-green-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Permissions */}
              {removedPermissions.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center mb-3">
                    <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                    <h5 className="font-medium text-red-800">
                      Removed Permissions ({removedPermissions.length})
                    </h5>
                  </div>
                  <div className="space-y-2">
                    {removedPermissions.map(({ permission }) => (
                      <div key={permission.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-red-800">
                            {permission.resource}.{permission.action}
                          </span>
                          <p className="text-xs text-red-600">{permission.description}</p>
                        </div>
                        <XCircleIcon className="h-4 w-4 text-red-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h5 className="font-medium text-gray-900 mb-2">Summary</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Current permissions: {role.permissions.length}</p>
                  <p>New permissions: {newPermissions.length}</p>
                  <p>Net change: {newPermissions.length - role.permissions.length > 0 ? '+' : ''}{newPermissions.length - role.permissions.length}</p>
                </div>
              </div>
            </div>

            {/* Affected Users */}
            <div className="space-y-4">
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-md font-medium text-gray-900">
                  Affected Users ({role.userCount || 0})
                </h4>
              </div>

              {loadingUsers ? (
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                  {affectedUsers.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {affectedUsers.map((user) => (
                        <div key={user.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.name || user.email}
                              </p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.status === 'active' ? 'bg-green-100 text-green-800' :
                                user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </div>
                          </div>
                          {user.lastLogin && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last login: {new Date(user.lastLogin).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No users currently assigned to this role
                    </div>
                  )}
                </div>
              )}

              {/* Impact Warnings */}
              {removedPermissions.length > 0 && affectedUsers.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-medium text-yellow-800">Warning</h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        Removing permissions will immediately affect {affectedUsers.length} user{affectedUsers.length !== 1 ? 's' : ''}.
                        They may lose access to features they are currently using.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                severity === 'high'
                  ? 'bg-red-600 hover:bg-red-700'
                  : severity === 'medium'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Applying Changes...' : 'Confirm Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}