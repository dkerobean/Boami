'use client';

import { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

interface PermissionSelectorProps {
  permissions: Record<string, Permission[]>;
  selectedPermissions: string[];
  onPermissionToggle: (permissionId: string) => void;
  onSelectAll: (resource?: string) => void;
  onDeselectAll: (resource?: string) => void;
  disabled?: boolean;
  showSearch?: boolean;
  showGroupControls?: boolean;
  compact?: boolean;
}

export default function PermissionSelector({
  permissions,
  selectedPermissions,
  onPermissionToggle,
  onSelectAll,
  onDeselectAll,
  disabled = false,
  showSearch = true,
  showGroupControls = true,
  compact = false
}: PermissionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set(Object.keys(permissions)));
  const [filterBySelected, setFilterBySelected] = useState<'all' | 'selected' | 'unselected'>('all');

  const allPermissions = useMemo(() => Object.values(permissions).flat(), [permissions]);

  const filteredPermissions = useMemo(() => {
    const filtered: Record<string, Permission[]> = {};

    Object.entries(permissions).forEach(([resource, resourcePermissions]) => {
      let filteredResourcePermissions = resourcePermissions;

      // Apply search filter
      if (searchTerm) {
        filteredResourcePermissions = filteredResourcePermissions.filter(permission =>
          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          resource.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply selection filter
      if (filterBySelected === 'selected') {
        filteredResourcePermissions = filteredResourcePermissions.filter(permission =>
          selectedPermissions.includes(permission.id)
        );
      } else if (filterBySelected === 'unselected') {
        filteredResourcePermissions = filteredResourcePermissions.filter(permission =>
          !selectedPermissions.includes(permission.id)
        );
      }

      if (filteredResourcePermissions.length > 0) {
        filtered[resource] = filteredResourcePermissions;
      }
    });

    return filtered;
  }, [permissions, searchTerm, filterBySelected, selectedPermissions]);

  const getResourceStats = (resource: string) => {
    const resourcePermissions = permissions[resource] || [];
    const selectedCount = resourcePermissions.filter(p => selectedPermissions.includes(p.id)).length;
    const totalCount = resourcePermissions.length;
    return { selectedCount, totalCount };
  };

  const toggleResourceExpansion = (resource: string) => {
    const newExpanded = new Set(expandedResources);
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource);
    } else {
      newExpanded.add(resource);
    }
    setExpandedResources(newExpanded);
  };

  const isResourceFullySelected = (resource: string): boolean => {
    const resourcePermissions = permissions[resource] || [];
    return resourcePermissions.length > 0 && resourcePermissions.every(p => selectedPermissions.includes(p.id));
  };

  const isResourcePartiallySelected = (resource: string): boolean => {
    const resourcePermissions = permissions[resource] || [];
    const selectedCount = resourcePermissions.filter(p => selectedPermissions.includes(p.id)).length;
    return selectedCount > 0 && selectedCount < resourcePermissions.length;
  };

  const handleResourceToggle = (resource: string) => {
    if (disabled) return;

    if (isResourceFullySelected(resource)) {
      onDeselectAll(resource);
    } else {
      onSelectAll(resource);
    }
  };

  const totalSelected = selectedPermissions.length;
  const totalPermissions = allPermissions.length;

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            Permissions ({totalSelected}/{totalPermissions} selected)
          </span>
        </div>

        {showGroupControls && !disabled && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelectAll()}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => onDeselectAll()}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      {showSearch && (
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <select
              value={filterBySelected}
              onChange={(e) => setFilterBySelected(e.target.value as 'all' | 'selected' | 'unselected')}
              className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Permissions</option>
              <option value="selected">Selected Only</option>
              <option value="unselected">Unselected Only</option>
            </select>
            <FunnelIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Permissions List */}
      <div className={`border border-gray-200 rounded-md ${compact ? 'max-h-48' : 'max-h-96'} overflow-y-auto`}>
        {Object.keys(filteredPermissions).length === 0 ? (
          <div className="p-8 text-center">
            <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No permissions available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(filteredPermissions).map(([resource, resourcePermissions]) => {
              const { selectedCount, totalCount } = getResourceStats(resource);
              const isExpanded = expandedResources.has(resource);
              const isFullySelected = isResourceFullySelected(resource);
              const isPartiallySelected = isResourcePartiallySelected(resource);

              return (
                <div key={resource} className="p-4">
                  {/* Resource Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleResourceExpansion(resource)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                        )}
                      </button>

                      <div className="flex items-center space-x-2">
                        {!disabled && (
                          <input
                            type="checkbox"
                            checked={isFullySelected}
                            ref={(input) => {
                              if (input) input.indeterminate = isPartiallySelected;
                            }}
                            onChange={() => handleResourceToggle(resource)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        <h4 className="font-medium text-gray-900 capitalize">{resource}</h4>
                        <span className="text-xs text-gray-500">
                          ({selectedCount}/{totalCount})
                        </span>
                      </div>
                    </div>

                    {showGroupControls && !disabled && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onSelectAll(resource)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => onDeselectAll(resource)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          None
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resource Permissions */}
                  {isExpanded && (
                    <div className="ml-8 space-y-2">
                      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {resourcePermissions.map((permission) => (
                          <label
                            key={permission.id}
                            className={`flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50 ${
                              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(permission.id)}
                              onChange={() => onPermissionToggle(permission.id)}
                              disabled={disabled}
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {permission.action}
                                </span>
                                {selectedPermissions.includes(permission.id) && (
                                  <CheckIcon className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              {!compact && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {permission.description}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {totalSelected > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2" />
            <span className="text-sm text-blue-800">
              {totalSelected} permission{totalSelected !== 1 ? 's' : ''} selected
              {totalSelected > 0 && totalPermissions > 0 && (
                <span className="ml-1">
                  ({Math.round((totalSelected / totalPermissions) * 100)}% of total)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}