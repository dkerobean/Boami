'use client';

import { useCallback } from 'react';
import { useLoadingContext } from '@/app/components/shared/loading/LoadingContext';
import { LoadingConfig, UseLoadingReturn } from '@/app/components/shared/loading/types';
import { logLoadingEvent, validateLoadingConfig } from '@/app/components/shared/loading/utils';

/**
 * Custom hook for components to interact with the loading system
 * Provides methods for programmatic loading control
 */
export const useLoading = (): UseLoadingReturn => {
  const { isLoading, setLoading, config, updateConfig } = useLoadingContext();

  /**
   * Start loading programmatically
   */
  const startLoading = useCallback(() => {
    logLoadingEvent('Manual loading started');
    setLoading(true);
  }, [setLoading]);

  /**
   * Stop loading programmatically
   */
  const stopLoading = useCallback(() => {
    logLoadingEvent('Manual loading stopped');
    setLoading(false);
  }, [setLoading]);

  /**
   * Update loading configuration
   */
  const setConfig = useCallback((newConfig: Partial<LoadingConfig>) => {
    if (validateLoadingConfig(newConfig)) {
      logLoadingEvent('Configuration updated', newConfig);
      updateConfig(newConfig);
    } else {
      console.warn('[useLoading] Invalid configuration provided, ignoring update');
    }
  }, [updateConfig]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    setConfig,
  };
};

export default useLoading;