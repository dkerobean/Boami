/**
 * Constants and default values for the loading system
 */

import { LoadingConfig, LoadingConfiguration } from './types';

export const DEFAULT_LOADING_CONFIG: Required<LoadingConfig> = {
  minDisplayTime: 200, // 200ms minimum to prevent flashing
  maxDisplayTime: 5000, // 5 seconds maximum timeout
  animationType: 'circular',
  showLogo: false,
  showText: false,
  customText: 'Loading...',
  fadeOutDuration: 150, // 150ms fade out
  size: 'medium',
  color: 'primary',
};

export const DEFAULT_LOADING_CONFIGURATION: LoadingConfiguration = {
  global: {
    enabled: true,
    minDisplayTime: 200,
    maxDisplayTime: 5000,
    fadeOutDuration: 150,
  },
  animation: {
    type: 'circular',
    size: 'medium',
    color: 'primary',
  },
  content: {
    showLogo: false,
    showText: false,
    customText: 'Loading...',
  },
  accessibility: {
    announceNavigation: true,
    respectMotionPreferences: true,
  },
};

export const LOADING_Z_INDEX = 9999;

export const LOADING_OVERLAY_ID = 'page-loading-overlay';

export const LOADING_ANIMATION_DURATION = {
  FADE_IN: 100,
  FADE_OUT: 150,
  PULSE: 1000,
  DOTS: 600,
} as const;