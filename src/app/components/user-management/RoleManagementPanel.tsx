'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  TableCellsIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import PermissionMatrix from './PermissionMatrix';
import RoleImpactAnalysis from './RoleImpactAnalysis';
import PermissionSelector from './PermissionSelector';

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
  createdAt: string;
  updatedAt: string;
}

interface RoleManagementPanelProps {
  onCreateRole: (roleData: { name: string; description: string; permissions: string[] }) => Promise<void>;
  onUpdateRole: (roleId: string, updates: { name?: string; description?: string; permissions?: string[] }) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
  refreshTrigger?: number;
}

export default function RoleManagementPanel({
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  refreshTrigger = 0
}: RoleManagementPanelProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list');
  const [showImpactAnalysis, setShowImpactAnalysis] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [refreshTrigger]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/roles?includePermissions=true&includeUserCount=true');

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions?groupByResource=true');

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
    } else if (formData.name.length > 50) {
      errors.name = 'Role name is too long';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length > 255) {
      errors.description = 'Description is too long';
    }

    if (formData.permissions.length === 0) {
      errors.permissions = 'At least one permission is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onCreateRole(formData);
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      setFormErrors({ submit: error instanceof Error ? error.message : 'Failed to create role' });
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedRole) {
      return;
    }

    // Show impact analysis for permission changes
    const currentPermissionIds = selectedRole.permissions.map(p => p.id);
    const hasChanges = formData.permissions.length !== currentPermissionIds.length ||
      !formData.permissions.every(id => currentPermissionIds.includes(id));

    if (hasChanges && !selectedRole.isSystem) {
      setPendingPermissions(formData.permissions);
      setShowImpactAnalysis(true);
      return;
    }

    try {
      await onUpdateRole(selectedRole.id, formData);
      resetForm();
      setShowEditForm(false);
      setSelectedRole(null);
    } catch (error) {
      setFormErrors({ submit: error instanceof Error ? error.message : 'Failed to update role' });
    }
  };

  const handleConfirmPermissionChanges = async () => {
    if (!selectedRole) return;

    try {
      await onUpdateRole(selectedRole.id, { ...formData, permissions: pendingPermissions });
      resetForm();
      setShowEditForm(false);
      setSelectedRole(null);
      setShowImpactAnalysis(false);
      setPendingPermissions([]);
    } catch (error) {
      setFormErrors({ submit: error instanceof Error ? error.message : 'Failed to update role' });
      setShowImpactAnalysis(false);
    }
  };

  const handleUpdateRolePermissions = async (roleId: string, permissionIds: string[]) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    await onUpdateRole(roleId, { permissions: permissionIds });
    await fetchRoles(); // Refresh roles after update
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      alert('Cannot delete system role');
      return;
    }

    if (role.userCount && role.userCount > 0) {
      alert(`Cannot delete role with ${role.userCount} assigned user(s)`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await onDeleteRole(role.id);
    } catch (error) {
      alert('Failed to delete role');
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.id)
    });
    setFormErrors({});
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: []
    });
    setFormErrors({});
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleSelectAllPermissions = (resource?: string) => {
    if (resource) {
      const resourcePermissions = permissions[resource] || [];
      const resourcePermissionIds = resourcePermissions.map(p => p.id);
      setFormData(prev => ({
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...resourcePermissionIds]))
      }));
    } else {
      const allPermissionIds = Object.values(permissions).flat().map(p => p.id);
      setFormData(prev => ({
        ...prev,
        permissions: allPermissionIds
      }));
    }
  };

  const handleDeselectAllPermissions = (resource?: string) => {
    if (resource) {
      const resourcePermissions = permissions[resource] || [];
      const resourcePermissionIds = resourcePermissions.map(p => p.id);
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => !resourcePermissionIds.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: []
      }));
    }
  };

  const getRoleColor = (role: Role) => {
    if (role.isSystem) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading roles</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchRoles}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Roles & Permissions</h2>
          <p className="text-sm text-gray-500">Manage roles and their associated permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Tab Navigation */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-1 inline" />
              Manage
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'matrix'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TableCellsIcon className="h-4 w-4 mr-1 inline" />
              Matrix
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Role
          </button>
        </div>
      </div>

      {/* Create Role Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Role</h3>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter role name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter role description"
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <PermissionSelector
                permissions={permissions}
                selectedPermissions={formData.permissions}
                onPermissionToggle={handlePermissionToggle}
                onSelectAll={handleSelectAllPermissions}
                onDeselectAll={handleDeselectAllPermissions}
                showSearch={true}
                showGroupControls={true}
                compact={false}
              />
              {formErrors.permissions && (
                <p className="mt-1 text-sm text-red-600">{formErrors.permissions}</p>
              )}
            </div>

            {formErrors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-sm">{formErrors.submit}</p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Create Role
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Role Form */}
      {showEditForm && selectedRole && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Role: {selectedRole.name}</h3>
          <form onSubmit={handleUpdateRole} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={selectedRole.isSystem}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedRole.isSystem ? 'bg-gray-100 cursor-not-allowed' : ''
                  } ${formErrors.name ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Enter role name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={selectedRole.isSystem}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedRole.isSystem ? 'bg-gray-100 cursor-not-allowed' : ''
                  } ${formErrors.description ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Enter role description"
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <PermissionSelector
                permissions={permissions}
                selectedPermissions={formData.permissions}
                onPermissionToggle={handlePermissionToggle}
                onSelectAll={handleSelectAllPermissions}
                onDeselectAll={handleDeselectAllPermissions}
                disabled={selectedRole.isSystem}
                showSearch={true}
                showGroupControls={true}
                compact={false}
              />
              {formErrors.permissions && (
                <p className="mt-1 text-sm text-red-600">{formErrors.permissions}</p>
              )}
            </div>

            {selectedRole.isSystem && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800 text-sm">
                  This is a system role and cannot be modified.
                </p>
              </div>
            )}

            {formErrors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-sm">{formErrors.submit}</p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedRole(null);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              {!selectedRole.isSystem && (
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Update Role
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'list' ? (
        /* Roles List */
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Existing Roles</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {roles.map((role) => (
              <div key={role.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{role.name}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
                            {role.isSystem ? 'System' : 'Custom'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">
                            {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                          </span>
                          {role.userCount !== undefined && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <UsersIcon className="h-3 w-3 mr-1" />
                              {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Edit role"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete role"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="mt-4">
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 6).map((permission) => (
                      <span
                        key={permission.id}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {permission.resource}.{permission.action}
                      </span>
                    ))}
                    {role.permissions.length > 6 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        +{role.permissions.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {roles.length === 0 && (
            <div className="text-center py-12">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first role
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Permission Matrix */
        <PermissionMatrix
          roles={roles}
          permissions={permissions}
          onUpdateRolePermissions={handleUpdateRolePermissions}
          loading={loading}
        />
      )}

      {/* Impact Analysis Modal */}
      {showImpactAnalysis && selectedRole && (
        <RoleImpactAnalysis
          role={selectedRole}
          newPermissions={pendingPermissions}
          allPermissions={Object.values(permissions).flat()}
          onClose={() => {
            setShowImpactAnalysis(false);
            setPendingPermissions([]);
          }}
          onConfirm={handleConfirmPermissionChanges}
          loading={loading}
        />
      )}
    </div>
  );
}