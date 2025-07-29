'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';
import InvitationErrorDisplay, { useInvitationErrors } from './InvitationErrorDisplay';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface InvitationData {
  email: string;
  roleId: string;
}

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (invitations: InvitationData[], customMessage?: string) => Promise<void>;
}

const emailSchema = z.string().email('Invalid email format');

export default function UserInviteModal({ isOpen, onClose, onInvite }: UserInviteModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([
    { email: '', roleId: '' }
  ]);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<number, { email?: string; roleId?: string }>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { errors: invitationErrors, addError: addInvitationError, removeError: removeInvitationError, clearErrors: clearInvitationErrors } = useInvitationErrors();

  // Fetch roles when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const validateInvitation = (invitation: InvitationData, index: number): boolean => {
    const newErrors: { email?: string; roleId?: string } = {};

    // Validate email
    const emailValidation = emailSchema.safeParse(invitation.email);
    if (!emailValidation.success) {
      newErrors.email = 'Invalid email format';
    }

    // Check for duplicate emails
    const duplicateIndex = invitations.findIndex(
      (inv, i) => i !== index && inv.email.toLowerCase() === invitation.email.toLowerCase()
    );
    if (duplicateIndex !== -1) {
      newErrors.email = 'Duplicate email address';
    }

    // Validate role
    if (!invitation.roleId) {
      newErrors.roleId = 'Role is required';
    }

    setErrors(prev => ({
      ...prev,
      [index]: newErrors
    }));

    return Object.keys(newErrors).length === 0;
  };

  const validateAllInvitations = (): boolean => {
    let allValid = true;
    const newErrors: Record<number, { email?: string; roleId?: string }> = {};

    invitations.forEach((invitation, index) => {
      const invitationErrors: { email?: string; roleId?: string } = {};

      // Validate email
      const emailValidation = emailSchema.safeParse(invitation.email);
      if (!emailValidation.success) {
        invitationErrors.email = 'Invalid email format';
        allValid = false;
      }

      // Check for duplicate emails
      const duplicateIndex = invitations.findIndex(
        (inv, i) => i !== index && inv.email.toLowerCase() === invitation.email.toLowerCase()
      );
      if (duplicateIndex !== -1) {
        invitationErrors.email = 'Duplicate email address';
        allValid = false;
      }

      // Validate role
      if (!invitation.roleId) {
        invitationErrors.roleId = 'Role is required';
        allValid = false;
      }

      if (Object.keys(invitationErrors).length > 0) {
        newErrors[index] = invitationErrors;
      }
    });

    setErrors(newErrors);
    return allValid;
  };

  const addInvitation = () => {
    setInvitations(prev => [...prev, { email: '', roleId: '' }]);
  };

  const removeInvitation = (index: number) => {
    if (invitations.length > 1) {
      setInvitations(prev => prev.filter((_, i) => i !== index));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        // Reindex remaining errors
        const reindexedErrors: Record<number, { email?: string; roleId?: string }> = {};
        Object.entries(newErrors).forEach(([key, value]) => {
          const oldIndex = parseInt(key);
          if (oldIndex > index) {
            reindexedErrors[oldIndex - 1] = value;
          } else if (oldIndex < index) {
            reindexedErrors[oldIndex] = value;
          }
        });
        return reindexedErrors;
      });
    }
  };

  const updateInvitation = (index: number, field: keyof InvitationData, value: string) => {
    setInvitations(prev => prev.map((inv, i) =>
      i === index ? { ...inv, [field]: value } : inv
    ));

    // Clear errors for this field
    setErrors(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: undefined
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllInvitations()) {
      return;
    }

    // Filter out empty invitations
    const validInvitations = invitations.filter(inv => inv.email.trim() && inv.roleId);

    if (validInvitations.length === 0) {
      setSubmitError('At least one valid invitation is required');
      return;
    }

    setLoading(true);
    setSubmitError(null);
    clearInvitationErrors();

    try {
      // Send invitations one by one to handle individual errors
      const results = await Promise.allSettled(
        validInvitations.map(async (invitation) => {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: invitation.email,
              roleId: invitation.roleId,
              customMessage: customMessage.trim() || undefined
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw {
              email: invitation.email,
              error: errorData
            };
          }

          return response.json();
        })
      );

      // Process results
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      // Handle failed invitations
      failed.forEach((result) => {
        if (result.status === 'rejected') {
          const failureData = result.reason;
          if (failureData.error) {
            addInvitationError(failureData.error, failureData.email);
          }
        }
      });

      // If all succeeded, close modal
      if (failed.length === 0) {
        handleClose();
      } else if (successful.length > 0) {
        // Some succeeded, show partial success message
        setSubmitError(`${successful.length} invitation(s) sent successfully, ${failed.length} failed. See errors below.`);
      }

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInvitations([{ email: '', roleId: '' }]);
    setCustomMessage('');
    setErrors({});
    setSubmitError(null);
    clearInvitationErrors();
    onClose();
  };

  const handleRetryInvitation = async (errorId: string) => {
    const errorItem = invitationErrors.find(e => e.id === errorId);
    if (!errorItem?.email) return;

    // Find the invitation data for this email
    const invitation = invitations.find(inv => inv.email === errorItem.email);
    if (!invitation) return;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitation.email,
          roleId: invitation.roleId,
          customMessage: customMessage.trim() || undefined
        }),
      });

      if (response.ok) {
        removeInvitationError(errorId);
      } else {
        const errorData = await response.json();
        // Update the error with new information
        removeInvitationError(errorId);
        addInvitationError(errorData, invitation.email);
      }
    } catch (error) {
      console.error('Error retrying invitation:', error);
    }
  };

  const handleResendInvitation = (errorId: string) => {
    handleRetryInvitation(errorId);
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : '';
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Invite Users
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Invitations */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        User Invitations
                      </label>
                      <button
                        type="button"
                        onClick={addInvitation}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Another
                      </button>
                    </div>

                    {invitations.map((invitation, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={invitation.email}
                            onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                            onBlur={() => validateInvitation(invitation, index)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[index]?.email ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="user@example.com"
                          />
                          {errors[index]?.email && (
                            <p className="mt-1 text-sm text-red-600">{errors[index].email}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <div className="flex space-x-2">
                            <select
                              value={invitation.roleId}
                              onChange={(e) => updateInvitation(index, 'roleId', e.target.value)}
                              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors[index]?.roleId ? 'border-red-300' : 'border-gray-300'
                              }`}
                            >
                              <option value="">Select a role</option>
                              {roles.map(role => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            {invitations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeInvitation(index)}
                                className="px-2 py-2 text-red-600 hover:text-red-800 focus:outline-none"
                                title="Remove invitation"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {errors[index]?.roleId && (
                            <p className="mt-1 text-sm text-red-600">{errors[index].roleId}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Message (Optional)
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a personal message to the invitation email..."
                      maxLength={500}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {customMessage.length}/500 characters
                    </p>
                  </div>

                  {/* Preview */}
                  {invitations.some(inv => inv.email && inv.roleId) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                      <div className="space-y-1">
                        {invitations
                          .filter(inv => inv.email && inv.roleId)
                          .map((inv, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              <span className="font-medium">{inv.email}</span> will be invited as{' '}
                              <span className="font-medium">{getRoleName(inv.roleId)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-red-800 text-sm">{submitError}</p>
                    </div>
                  )}

                  {/* Invitation Errors */}
                  {invitationErrors.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900">Invitation Errors:</h4>
                      {invitationErrors.map(({ id, error, email }) => (
                        <InvitationErrorDisplay
                          key={id}
                          error={error}
                          email={email}
                          onRetry={() => handleRetryInvitation(id)}
                          onResend={() => handleResendInvitation(id)}
                          onDismiss={() => removeInvitationError(id)}
                          loading={loading}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || invitations.every(inv => !inv.email || !inv.roleId)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        `Send ${invitations.filter(inv => inv.email && inv.roleId).length} Invitation${invitations.filter(inv => inv.email && inv.roleId).length !== 1 ? 's' : ''}`
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}