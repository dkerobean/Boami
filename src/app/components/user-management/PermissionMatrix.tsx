'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
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

interface PermissionMatrixProps {
  roles: Role[];
  permissions: Record<string, Permission[]>;
  onUpdateRolePermissions: (roleId: string, permissionIds: string[]) => Promise<void>;
  loading?: boolean;
}

export default function PermissionMatrix({
  roles,
  permissions,
  onUpdateRolePermissions,
  loading = false
}: PermissionMatrixProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const allPermissions = Object.values(permissions).flat();
  const resources = Object.keys(permissions);

  const hasPermission = (roleId: string, permissionId: string): boolean => {
    const role = roles.find(r => r.id === roleId);
    return role?.permissions.some(p => p.id === permissionId) || false;
  };

  const handleEditRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role && !role.isSystem) {
      setEditingRole(roleId);
      setTempPermissions(role.permissions.map(p => p.id));
    }
  };

  const handleSavePermissions = async () => {
    if (editingRole) {
      try {
        await onUpdateRolePermissions(editingRole, tempPermissions);
        setEditingRole(null);
        setTempPermissions([]);
      } catch (error) {
        console.error('Failed to update permissions:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setTempPermissions([]);
  };

  const togglePermission = (permissionId: string) => {
    if (editingRole) {
      setTempPermissions(prev =>
        prev.includes(permissionId)
          ? prev.filter(id => id !== permissionId)
          : [...prev, permissionId]
      );
    }
  };

  const getPermissionStatus = (roleId: string, permissionId: string): boolean => {
    if (editingRole === roleId) {
      return tempPermissions.includes(permissionId);
    }
    return hasPermission(roleId, permissionId);
  };

  const getRolePermissionCount = (roleId: string): number => {
    if (editingRole === roleId) {
      return tempPermissions.length;
    }
    const role = roles.find(r => r.id === roleId);
    return role?.permissions.length || 0;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
ssName="text-lg font-medium text-gray-900">Permission Matrix</h3>
          <p className="text-sm text-gray-500">
            View and manage permissions across all roles
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(showDetails ? null : 'all')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Role
                </th>
                {resources.map(resource => (
                  <th
                    key={resource}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    colSpan={permissions[resource].length}
                  >
                    {resource}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
              <tr className="bg-gray-50 border-t border-gray-200">
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 z-10">
                  Permission
                </th>
                {resources.map(resource =>
                  permissions[resource].map(permission => (
                    <th
                      key={permission.id}
                      className="px-2 py-2 text-center text-xs font-medium text-gray-500"
                      title={permission.description}
                    >
                      {permission.action}
                    </th>
                  ))
                )}
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className={selectedRole === role.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                          {role.isSystem && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              System
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getRolePermissionCount(role.id)} permissions
                          {role.userCount !== undefined && ` • ${role.userCount} users`}
                        </div>
                      </div>
                    </div>
                  </td>

                  {allPermissions.map((permission) => (
                    <td key={permission.id} className="px-2 py-4 text-center">
                      {editingRole === role.id ? (
                        <button
                          onClick={() => togglePermission(permission.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            getPermissionStatus(role.id, permission.id)
                              ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {getPermissionStatus(role.id, permission.id) && (
                            <CheckIcon className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto ${
                          getPermissionStatus(role.id, permission.id)
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          {getPermissionStatus(role.id, permission.id) ? (
                            <CheckIcon className="h-4 w-4" />
                          ) : (
                            <XMarkIcon className="h-4 w-4 text-gray-300" />
                          )}
                        </div>
                      )}
                    </td>
                  ))}

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {editingRole === role.id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={handleSavePermissions}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="View details"
                        >
                          <InformationCircleIcon className="h-4 w-4" />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => handleEditRole(role.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Edit permissions"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Details Panel */}
      {selectedRole && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {(() => {
            const role = roles.find(r => r.id === selectedRole);
            if (!role) return null;

            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    {role.name} - Permission Details
                  </h4>
                  <button
                    onClick={() => setSelectedRole(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Role Information</h5>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-sm text-gray-900">{role.description}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Type</dt>
                        <dd className="text-sm text-gray-900">
                          {role.isSystem ? 'System Role' : 'Custom Role'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Users Assigned</dt>
                        <dd className="text-sm text-gray-900">{role.userCount || 0}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Total Permissions</dt>
                        <dd className="text-sm text-gray-900">{role.permissions.length}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Permissions by Resource</h5>
                    <div className="space-y-3">
                      {resources.map(resource => {
                        const resourcePermissions = role.permissions.filter(p => p.resource === resource);
                        const totalResourcePermissions = permissions[resource].length;

                        return (
                          <div key={resource} className="border border-gray-200 rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-gray-900 capitalize">{resource}</h6>
                              <span className="text-xs text-gray-500">
                                {resourcePermissions.length}/{totalResourcePermissions}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {resourcePermissions.map(permission => (
                                <span
                                  key={permission.id}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                                >
                                  {permission.action}
                                </span>
                              ))}
                              {resourcePermissions.length === 0 && (
                                <span className="text-xs text-gray-500 italic">No permissions</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded border-2 bg-green-500 border-green-500 flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white" />
            </div>
            <span>Permission granted</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded border-2 border-gray-300 flex items-center justify-center">
              <XMarkIcon className="h-3 w-3 text-gray-300" />
            </div>
            <span>Permission denied</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              System
            </span>
            <span>System role (cannot be modified)</span>
          </div>
        </div>
      </div>
    </div>
  );
}