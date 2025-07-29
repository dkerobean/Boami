'use client';

import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface MigrationStatus {
  stringRoleUsers: number;
  objectIdRoleUsers: number;
  totalRoles: number;
  totalPermissions: number;
  migrationNeeded: boolean;
  rbacSeeded: boolean;
}

export default function MigrationPage() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/migrate-rbac');
      const data = await response.json();

      if (response.ok) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to check status');
      }
    } catch (error) {
      setError('Failed to check migration status');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (action: 'migrate' | 'rollback') => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/admin/migrate-rbac', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        // Refresh status after migration
        setTimeout(checkStatus, 1000);
      } else {
        setError(data.error || `Failed to ${action}`);
      }
    } catch (error) {
      setError(`Failed to ${action} RBAC system`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="texxl font-bold text-gray-900">RBAC Migration</h1>
            <p className="text-sm text-gray-500 mt-1">
              Migrate your existing user roles to the new Role-Based Access Control system
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Migration Status</h2>

              {loading && !status ? (
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Checking status...</span>
                </div>
              ) : status ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Users</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>String-based roles:</span>
                        <span className={status.stringRoleUsers > 0 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                          {status.stringRoleUsers}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>ObjectId-based roles:</span>
                        <span className="text-green-600 font-medium">{status.objectIdRoleUsers}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">RBAC System</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Roles:</span>
                        <span className="text-gray-600">{status.totalRoles}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Permissions:</span>
                        <span className="text-gray-600">{status.totalPermissions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Migration Actions */}
            {status && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>

                {status.migrationNeeded ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Migration Required
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700">
                          You have {status.stringRoleUsers} user(s) with old string-based roles that need to be migrated to the new RBAC system.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <div className="flex">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Migration Complete
                        </h3>
                        <p className="mt-1 text-sm text-green-700">
                          All users have been migrated to the new RBAC system.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    onClick={() => runMigration('migrate')}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4 mr-2" />
                    )}
                    Run Migration
                  </button>

                  <button
                    onClick={checkStatus}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Migration Result</h2>

                {result.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Migration Successful
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>{result.message}</p>
                          {result.migratedUsers !== undefined && (
                            <p>Migrated {result.migratedUsers} user(s)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Migration Failed
                        </h3>
                        <p className="mt-1 text-sm text-red-700">
                          {result.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                What does this migration do?
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Creates default roles (Super Admin, Admin, Manager, User, Viewer)</li>
                <li>• Creates permissions for all resources (users, roles, finance, products, etc.)</li>
                <li>• Converts existing string-based user roles to ObjectId references</li>
                <li>• Adds new RBAC fields to user records (status, invitedBy, invitedAt)</li>
                <li>• Maps old roles: admin → Admin, manager → Manager, user → User</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}