'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { LoadingContextType, LoadingConfig, LoadingState, LoadingProviderProps } from './types';
import { DEFAULT_LOADING_CONFIG } from './constants';
import { LoadingConfigManager } from './ConfigManager';

/**
 * React context for managing global loading state
 */
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

/**
 * Hook to access the loading context
 * @throws Error if used outside of LoadingProvider
 */
export const useLoadingContext = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
};

/**
 * Loading Context Provider component
 * Provides loading state management to child components
 */
export const LoadingContextProvider: React.FC<LoadingProviderProps> = ({
  children,
  config: initialConfig = {}
}) => {
  const configManager = LoadingConfigManager.getInstance();

  // Initialize config with manager and initial config
  const [config, setConfig] = useState<LoadingConfig>(() => {
    const managerConfig = configManager.getConfig();
    return {
      ...managerConfig,
      ...initialConfig,
    };
  });

  // Loading state management
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Detailed loading state for internal tracking
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isActive: false,
    startTime: null,
    minDisplayTime: config.minDisplayTime || DEFAULT_LOADING_CONFIG.minDisplayTime,
    currentRoute: null,
    previousRoute: null,
    animationType: config.animationType || DEFAULT_LOADING_CONFIG.animationType,
  });

  // Subscribe to configuration manager changes
  useEffect(() => {
    const unsubscribe = configManager.subscribe((newConfig) => {
      setConfig(prev => ({
        ...prev,
        ...newConfig,
      }));
    });

    return unsubscribe;
  }, [configManager]);

  /**
   * Update loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    const now = Date.now();

    setIsLoading(loading);
    setLoadingState(prev => ({
      ...prev,
      isActive: loading,
      startTime: loading ? now : null,
      ...(loading && { previousRoute: prev.currentRoute }),
    }));
  }, []);

  /**
   * Update configuration through the config manager
   */
  const updateConfig = useCallback((newConfig: Partial<LoadingConfig>) => {
    const success = configManager.updateConfig(newConfig);

    if (success) {
      // Update loading state if animation type changed
      if (newConfig.animationType) {
        setLoadingState(prevState => ({
          ...prevState,
          animationType: newConfig.animationType!,
        }));
      }
    }

    return success;
  }, [configManager]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<LoadingContextType>(() => ({
    isLoading,
    setLoading,
    config,
    updateConfig,
    loadingState,
  }), [isLoading, setLoading, config, updateConfig, loadingState]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;