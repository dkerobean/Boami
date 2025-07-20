/**
 * Loading system exports
 * Central export file for all loading system components and utilities
 */

// Types and interfaces
export type {
  AnimationType,
  LoadingSize,
  LoadingColor,
  LoadingConfig,
  LoadingState,
  LoadingConfiguration,
  LoadingTimeoutHandler,
  LoadingContextType,
  LoadingProviderProps,
  LoadingOverlayProps,
  LoadingAnimationProps,
  UseLoadingReturn,
} from './types';

// Constants
export {
  DEFAULT_LOADING_CONFIG,
  DEFAULT_LOADING_CONFIGURATION,
  LOADING_Z_INDEX,
  LOADING_OVERLAY_ID,
  LOADING_ANIMATION_DURATION,
} from './constants';

// Context and provider
export {
  LoadingContextProvider,
  useLoadingContext,
  default as LoadingContext,
} from './LoadingContext';

// Main provider component
export {
  LoadingProvider,
  default as LoadingProviderDefault,
} from './LoadingProvider';

// Loading overlay component
export {
  LoadingOverlay,
  default as LoadingOverlayDefault,
} from './LoadingOverlay';

// Loading animation component
export {
  LoadingAnimation,
  default as LoadingAnimationDefault,
} from './LoadingAnimation';

// Configuration management
export {
  LoadingConfigManager,
  useLoadingConfigManager,
} from './ConfigManager';

// Error handling
export {
  LoadingErrorHandler,
  withLoadingErrorBoundary,
} from './ErrorHandler';

// Performance optimization
export {
  LoadingPerformanceMonitor,
  optimizeConfigForPerformance,
  isSlowDevice,
  isFastConnection,
  createOptimizedResizeHandler,
  getMemoryUsage,
  isMemoryPressureHigh,
  getOptimalAnimationSettings,
} from './performance';

// Utilities
export {
  mergeLoadingConfig,
  hasMinimumTimeElapsed,
  hasMaximumTimeExceeded,
  getAnimationDuration,
  prefersReducedMotion,
  debounce,
  logLoadingEvent,
  validateLoadingConfig,
} from './utils';