'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingContext } from '@/app/components/shared/loading/LoadingContext';
import { LoadingAnimation } from '@/app/components/shared/loading/LoadingAnimation';

interface AuthTransitionProps {
  isVisible: boolean;
  type: 'login' | 'register' | 'verification';
  onComplete?: () => void;
}

/**
 * Smooth transition component for authentication flows
 * Provides progressive loading messages and branded experience
 */
export const AuthTransition: React.FC<AuthTransitionProps> = ({
  isVisible,
  type,
  onComplete,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { updateConfig } = useLoadingContext();
  const [currentStep, setCurrentStep] = useState(0);

  // Progressive loading messages based on auth type
  const getProgressiveMessages = (authType: string) => {
    switch (authType) {
      case 'login':
        return [
          'Authenticating credentials...',
          'Verifying account status...',
          'Loading your dashboard...',
          'Almost ready...'
        ];
      case 'register':
        return [
          'Creating your account...',
          'Setting up your profile...',
          'Preparing verification...',
          'Redirecting...'
        ];
      case 'verification':
        return [
          'Verifying your email...',
          'Activating account...',
          'Finalizing setup...',
          'Taking you to login...'
        ];
      default:
        return ['Processing...', 'Almost ready...'];
    }
  };

  const messages = getProgressiveMessages(type);

  // Progressive message updates
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        if (nextStep < messages.length) {
          // Update global loading config with new message
          updateConfig({
            customText: messages[nextStep],
            animationType: nextStep === messages.length - 1 ? 'pulse' : 'dots'
          });
          return nextStep;
        }
        return prev;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isVisible, messages, updateConfig]);

  // Handle completion
  useEffect(() => {
    if (currentStep >= messages.length - 1 && isVisible) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, messages.length, isVisible, onComplete]);

  // Initialize first message
  useEffect(() => {
    if (isVisible && messages.length > 0) {
      updateConfig({
        showText: true,
        customText: messages[0],
        animationType: 'dots',
        showLogo: false,
        size: 'large',
        color: 'primary'
      });
      setCurrentStep(0);
    }
  }, [isVisible, messages, updateConfig]);

  return null; // This component only manages loading state updates
};

/**
 * Hook to trigger auth transitions
 */
export const useAuthTransition = () => {
  const { setLoading, updateConfig } = useLoadingContext();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = (type: 'login' | 'register' | 'verification') => {
    setIsTransitioning(true);
    setLoading(true);

    // Set initial config based on transition type
    updateConfig({
      showText: true,
      showLogo: false,
      size: 'large',
      color: 'primary',
      animationType: 'dots',
      minDisplayTime: 800,
      fadeOutDuration: 300
    });
  };

  const completeTransition = () => {
    setIsTransitioning(false);
    // Loading will be stopped by navigation or manual call
  };

  const stopTransition = () => {
    setIsTransitioning(false);
    setLoading(false);
  };

  return {
    isTransitioning,
    startTransition,
    completeTransition,
    stopTransition
  };
};

export default AuthTransition;