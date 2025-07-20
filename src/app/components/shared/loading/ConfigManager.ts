/**
 * Configuration management system for the loading system
 * Handles configuration validation, merging, and persistence
 */

import { LoadingConfig, LoadingConfiguration } from './types';
import { DEFAULT_LOADING_CONFIG, DEFAULT_LOADING_CONFIGURATION } from './constants';
import { validateLoadingConfig, logLoadingEvent } from './utils';

/**
 * Configuration Manager class for handling loading system configuration
 */
export class LoadingConfigManager {
  private static instance: LoadingConfigManager;
  private currentConfig: LoadingConfig;
  private listeners: Set<(config: LoadingConfig) => void> = new Set();

  private constructor() {
    this.currentConfig = { ...DEFAULT_LOADING_CONFIG };
    this.loadPersistedConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LoadingConfigManager {
    if (!LoadingConfigManager.instance) {
      LoadingConfigManager.instance = new LoadingConfigManager();
    }
    return LoadingConfigManager.instance;
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoadingConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration with   */
  public updateConfig(newConfig: Partial<LoadingConfig>): boolean {
    try {
      // Validate new configuration
      if (!validateLoadingConfig(newConfig)) {
        logLoadingEvent('Configuration validation failed', newConfig);
        return false;
      }

      // Merge with current configuration
      const mergedConfig = this.mergeConfigs(this.currentConfig, newConfig);

      // Validate merged configuration
      if (!validateLoadingConfig(mergedConfig)) {
        logLoadingEvent('Merged configuration validation failed', mergedConfig);
        return false;
      }

      // Update current configuration
      const previousConfig = { ...this.currentConfig };
      this.currentConfig = mergedConfig;

      // Persist configuration
      this.persistConfig();

      // Notify listeners
      this.notifyListeners();

      logLoadingEvent('Configuration updated', {
        previous: previousConfig,
        current: this.currentConfig,
      });

      return true;
    } catch (error) {
      console.error('[LoadingConfigManager] Error updating configuration:', error);
      return false;
    }
  }

  /**
   * Reset configuration to defaults
   */
  public resetConfig(): void {
    this.currentConfig = { ...DEFAULT_LOADING_CONFIG };
    this.persistConfig();
    this.notifyListeners();
    logLoadingEvent('Configuration reset to defaults');
  }

  /**
   * Subscribe to configuration changes
   */
  public subscribe(listener: (config: LoadingConfig) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get configuration schema for validation
   */
  public getConfigSchema(): Record<string, any> {
    return {
      minDisplayTime: {
        type: 'number',
        min: 0,
        max: 10000,
        default: DEFAULT_LOADING_CONFIG.minDisplayTime,
      },
      maxDisplayTime: {
        type: 'number',
        min: 1000,
        max: 30000,
        default: DEFAULT_LOADING_CONFIG.maxDisplayTime,
      },
      animationType: {
        type: 'string',
        enum: ['circular', 'linear', 'dots', 'pulse'],
        default: DEFAULT_LOADING_CONFIG.animationType,
      },
      showLogo: {
        type: 'boolean',
        default: DEFAULT_LOADING_CONFIG.showLogo,
      },
      showText: {
        type: 'boolean',
        default: DEFAULT_LOADING_CONFIG.showText,
      },
      customText: {
        type: 'string',
        maxLength: 100,
        default: DEFAULT_LOADING_CONFIG.customText,
      },
      fadeOutDuration: {
        type: 'number',
        min: 50,
        max: 1000,
        default: DEFAULT_LOADING_CONFIG.fadeOutDuration,
      },
      size: {
        type: 'string',
        enum: ['small', 'medium', 'large'],
        default: DEFAULT_LOADING_CONFIG.size,
      },
      color: {
        type: 'string',
        enum: ['primary', 'secondary', 'inherit'],
        default: DEFAULT_LOADING_CONFIG.color,
      },
    };
  }

  /**
   * Validate configuration against schema
   */
  public validateConfig(config: Partial<LoadingConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const schema = this.getConfigSchema();

    Object.entries(config).forEach(([key, value]) => {
      const fieldSchema = schema[key];
      if (!fieldSchema) {
        errors.push(`Unknown configuration field: ${key}`);
        return;
      }

      // Type validation
      if (typeof value !== fieldSchema.type) {
        errors.push(`Field ${key} must be of type ${fieldSchema.type}`);
        return;
      }

      // Enum validation
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push(`Field ${key} must be one of: ${fieldSchema.enum.join(', ')}`);
      }

      // Range validation for numbers
      if (fieldSchema.type === 'number') {
        if (fieldSchema.min !== undefined && value < fieldSchema.min) {
          errors.push(`Field ${key} must be at least ${fieldSchema.min}`);
        }
        if (fieldSchema.max !== undefined && value > fieldSchema.max) {
          errors.push(`Field ${key} must be at most ${fieldSchema.max}`);
        }
      }

      // String length validation
      if (fieldSchema.type === 'string' && fieldSchema.maxLength) {
        if (typeof value === 'string' && value.length > fieldSchema.maxLength) {
          errors.push(`Field ${key} must be at most ${fieldSchema.maxLength} characters`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration presets
   */
  public getPresets(): Record<string, LoadingConfig> {
    return {
      minimal: {
        ...DEFAULT_LOADING_CONFIG,
        animationType: 'circular',
        showLogo: false,
        showText: false,
        minDisplayTime: 100,
        size: 'small',
      },
      standard: {
        ...DEFAULT_LOADING_CONFIG,
        animationType: 'circular',
        showLogo: false,
        showText: true,
        customText: 'Loading...',
      },
      branded: {
        ...DEFAULT_LOADING_CONFIG,
        animationType: 'pulse',
        showLogo: true,
        showText: true,
        customText: 'Loading your content...',
        size: 'large',
      },
      fast: {
        ...DEFAULT_LOADING_CONFIG,
        animationType: 'linear',
        minDisplayTime: 50,
        fadeOutDuration: 100,
        showText: false,
      },
      elegant: {
        ...DEFAULT_LOADING_CONFIG,
        animationType: 'dots',
        showText: true,
        customText: 'Please wait...',
        size: 'medium',
        minDisplayTime: 300,
      },
    };
  }

  /**
   * Apply configuration preset
   */
  public applyPreset(presetName: string): boolean {
    const presets = this.getPresets();
    const preset = presets[presetName];

    if (!preset) {
      console.warn(`[LoadingConfigManager] Unknown preset: ${presetName}`);
      return false;
    }

    return this.updateConfig(preset);
  }

  /**
   * Export current configuration
   */
  public exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      return this.updateConfig(config);
    } catch (error) {
      console.error('[LoadingConfigManager] Error importing configuration:', error);
      return false;
    }
  }

  /**
   * Merge two configurations
   */
  private mergeConfigs(base: LoadingConfig, override: Partial<LoadingConfig>): LoadingConfig {
    return {
      ...base,
      ...override,
    };
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConfig());
      } catch (error) {
        console.error('[LoadingConfigManager] Error notifying listener:', error);
      }
    });
  }

  /**
   * Load persisted configuration from localStorage
   */
  private loadPersistedConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('loading-system-config');
      if (stored) {
        const config = JSON.parse(stored);
        if (validateLoadingConfig(config)) {
          this.currentConfig = this.mergeConfigs(DEFAULT_LOADING_CONFIG, config);
          logLoadingEvent('Configuration loaded from storage', this.currentConfig);
        }
      }
    } catch (error) {
      console.warn('[LoadingConfigManager] Error loading persisted configuration:', error);
    }
  }

  /**
   * Persist configuration to localStorage
   */
  private persistConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('loading-system-config', JSON.stringify(this.currentConfig));
      logLoadingEvent('Configuration persisted to storage');
    } catch (error) {
      console.warn('[LoadingConfigManager] Error persisting configuration:', error);
    }
  }
}

/**
 * Hook for using the configuration manager in React components
 */
export const useLoadingConfigManager = () => {
  const manager = LoadingConfigManager.getInstance();
  return manager;
};