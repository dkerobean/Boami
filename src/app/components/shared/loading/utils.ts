/**
 * Utility functions for the loading system
 */

import { LoadingConfig } from './types';
import { DEFAULT_LOADING_CONFIG } from './constants';

/**
 * Merge loading configuration with defaults
 */
export const mergeLoadingConfig = (config?: Partial<LoadingConfig>): LoadingConfig => {
  return {
    ...DEFAULT_LOADING_CONFIG,
    ...config,
  };
};

/**
 * Check if minimum display time has elapsed
 */
export const hasMinimumTimeElapsed = (startTime: number | null, minDisplayTime: number): boolean => {
  if (!startTime) return true;
  return Date.now() - startTime >= minDisplayTime;
};

/**
 * Check if maximum display time has been exceeded
 */
export const hasMaximumTimeExceeded = (startTime: number | null, maxDisplayTime: number): boolean => {
  if (!startTime) return false;
  return Date.now() - startTime >= maxDisplayTime;
};

/**
 * Get animation duration based on type
 */
export const getAnimationDuration = (type: string): number => {
  switch (type) {
    case 'circular':
      return 1000;
    case 'linear':
      return 2000;
    case 'dots':
      return 600;
    case 'pulse':
      return 1000;
    default:
      return 1000;
  }
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Debounce function to prevent rapid state changes
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Log loading events for debugging
 */
export const logLoadingEvent = (event: string, data?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Loading System] ${event}`, data);
  }
};

/**
 * Validate loading configuration
 */
export const validateLoadingConfig = (config: Partial<LoadingConfig>): boolean => {
  try {
    if (config.minDisplayTime && config.minDisplayTime < 0) {
      console.warn('[Loading System] minDisplayTime cannot be negative');
      return false;
    }

    if (config.maxDisplayTime && config.maxDisplayTime < 0) {
      console.warn('[Loading System] maxDisplayTime cannot be negative');
      return false;
    }

    if (config.minDisplayTime && config.maxDisplayTime &&
        config.minDisplayTime > config.maxDisplayTime) {
      console.warn('[Loading System] minDisplayTime cannot be greater than maxDisplayTime');
      return false;
    }

    if (config.fadeOutDuration && config.fadeOutDuration < 0) {
      console.warn('[Loading System] fadeOutDuration cannot be negative');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Loading System] Configuration validation error:', error);
    return false;
  }
};