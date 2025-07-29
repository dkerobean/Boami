'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/app/context/AuthContext';
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface WelcomeMessageProps {
  onDismiss?: () => void;
}

export default function WelcomeMessage({ onDismiss }: WelcomeMessageProps) {
  const { user } = useAuthContext();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if this is a first-time login
    const checkFirstTimeLogin = () => {
      if (!user) return;

      // Check if user was created recently (within last 5 minutes)
      const userCreatedAt = user.createdAt;
      if (userCreatedAt) {
        const createdTime = new Date(userCreatedAt).getTime();
        const now = new Date().getTime();
        const fiveMinutesAgo = now - (5 * 60 * 1000);

        if (createdTime > fiveMinutesAgo) {
          setShouldShow(true);
          setIsVisible(true);
        }
      }

      // Also check for URL parameter indicating successful account creation
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('welcome') === 'true') {
        setShouldShow(true);
        setIsVisible(true);

        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    };

    checkFirstTimeLogin();
  }, [user]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldShow(false);
      onDismiss?.();
    }, 300);
  };

  if (!shouldShow || !user) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-transform duration-300 ${
        isVisible ? 'scale-100' : 'scale-95'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Welcome to the Platform!</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Account Successfully Created</p>
              <p className="text-sm text-gray-600">
                Your account has been activated and you're now signed in.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <ShieldCheckIcon className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Your Role: {user.role?.name}</p>
              <p className="text-sm text-gray-600">
                {user.role?.description || 'You have been assigned appropriate permissions for your role.'}
              </p>
            </div>
          </div>

          {session.user.invitedBy && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Invited by:</strong> {session.user.invitedBy.firstName} {session.user.invitedBy.lastName}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {session.user.invitedBy.email}
              </p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Getting Started</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Explore the dashboard to familiarize yourself with available features</li>
              <li>• Update your profile information in the settings</li>
              <li>• Contact your administrator if you need additional permissions</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleDismiss}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}