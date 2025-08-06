/**
 * Core types and interfaces for the loading system
 */

export type AnimationType = 'circular' | 'linear' | 'dots' | 'pulse';

export type LoadingSize = 'small' | 'medium' | 'large';

export type LoadingColor = 'primary' | 'secondary' | 'inherit';

export interface LoadingConfig {
  minDisplayTime?: number; // Default: 200ms
  maxDisplayTime?: number; // Default: 5000ms
  animationType?: AnimationType;
  showLogo?: boolean;
  showText?: boolean;
  customText?: string;
  fadeInDuration?: number; // Default: 150ms
  fadeOutDuration?: number; // Default: 150ms
  size?: LoadingSize;
  color?: LoadingColor;
}

export interface LoadingState {
  isActive: boolean;
  startTime: number | null;
  minDisplayTime: number;
  currentRoute: string | null;
  previousRoute: string | null;
  animationType: AnimationType;
}

export interface LoadingConfiguration {
  global: {
    enabled: boolean;
    minDisplayTime: number;
    maxDisplayTime: number;
    fadeOutDuration: number;
  };
  animation: {
    type: AnimationType;
    size: LoadingSize;
    color: string;
  };
  content: {
    showLogo: boolean;
    showText: boolean;
    customText?: string;
  };
  accessibility: {
    announceNavigation: boolean;
    respectMotionPreferences: boolean;
  };
}

export interface LoadingTimeoutHandler {
  maxTimeout: number; // 5 seconds default
  onTimeout: () => void;
  fallbackAction: 'hide' | 'show-error' | 'retry';
}

export interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  config: LoadingConfig;
  updateConfig: (config: Partial<LoadingConfig>) => void;
  loadingState: LoadingState;
}

export interface LoadingProviderProps {
  children: React.ReactNode;
  config?: LoadingConfig;
}

export interface LoadingOverlayProps {
  isVisible: boolean;
  config: LoadingConfig;
  onAnimationComplete?: () => void;
}

export interface LoadingAnimationProps {
  type: AnimationType;
  size?: LoadingSize;
  color?: LoadingColor;
  showLogo?: boolean;
  showText?: boolean;
  text?: string;
  fullWidth?: boolean;
}

export interface UseLoadingReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setConfig: (config: Partial<LoadingConfig>) => void;
}