import { LoadingConfigManager } from '@/app/components/shared/loading/ConfigManager';
import { DEFAULT_LOADING_CONFIG } from '@/app/components/shared/loading/constants';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('LoadingConfigManager', () => {
  let configManager: LoadingConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (LoadingConfigManager as any).instance = undefined;
    configManager = LoadingConfigManager.getInstance();
  });

  afterEach(() => {
    configManager.resetConfig();
  });

  it('should be a singleton', () => {
    const instance1 = LoadingConfigManager.getInstance();
    const instance2 = LoadingConfigManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should return default configuration initially', () => {
    const config = configManager.getConfig();
    expect(config).toEqual(DEFAULT_LOADING_CONFIG);
  });

  it('should update configuration successfully', () => {
    const newConfig = { animationType: 'dots' as const, showText: true };
    const success = configManager.updateConfig(newConfig);

    expect(success).toBe(true);

    const updatedConfig = configManager.getConfig();
    expect(updatedConfig.animationType).toBe('dots');
    expect(updatedConfig.showText).toBe(true);
  });

  it('should reject invalid configuration', () => {
    const invalidConfig = { minDisplayTime: -100 };
    const success = configManager.updateConfig(invalidConfig);

    expect(success).toBe(false);
    expect(mockConsoleWarn).toHaveBeenCalled();
  });

  it('should validate configuration correctly', () => {
    const validConfig = { animationType: 'circular' as const, minDisplayTime: 200 };
    const validation = configManager.validateConfig(validConfig);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should return validation errors for invalid config', () => {
    const invalidConfig = { animationType: 'invalid' as any, minDisplayTime: -100 };
    const validation = configManager.validateConfig(invalidConfig);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should notify subscribers of configuration changes', () => {
    const listener = jest.fn();
    const unsubscribe = configManager.subscribe(listener);

    configManager.updateConfig({ animationType: 'linear' });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ animationType: 'linear' })
    );

    unsubscribe();
  });

  it('should unsubscribe listeners correctly', () => {
    const listener = jest.fn();
    const unsubscribe = configManager.subscribe(listener);

    unsubscribe();
    configManager.updateConfig({ animationType: 'pulse' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should reset configuration to defaults', () => {
    configManager.updateConfig({ animationType: 'dots', showText: true });
    configManager.resetConfig();

    const config = configManager.getConfig();
    expect(config).toEqual(DEFAULT_LOADING_CONFIG);
  });

  it('should provide configuration schema', () => {
    const schema = configManager.getConfigSchema();

    expect(schema).toHaveProperty('minDisplayTime');
    expect(schema).toHaveProperty('animationType');
    expect(schema.animationType.enum).toContain('circular');
  });

  it('should provide configuration presets', () => {
    const presets = configManager.getPresets();

    expect(presets).toHaveProperty('minimal');
    expect(presets).toHaveProperty('standard');
    expect(presets).toHaveProperty('branded');
    expect(presets.minimal.size).toBe('small');
  });

  it('should apply configuration presets', () => {
    const success = configManager.applyPreset('branded');

    expect(success).toBe(true);

    const config = configManager.getConfig();
    expect(config.animationType).toBe('pulse');
    expect(config.showLogo).toBe(true);
  });

  it('should handle unknown presets', () => {
    const success = configManager.applyPreset('unknown');

    expect(success).toBe(false);
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown preset: unknown')
    );
  });

  it('should export configuration as JSON', () => {
    configManager.updateConfig({ animationType: 'dots', showText: true });
    const exported = configManager.exportConfig();

    const parsed = JSON.parse(exported);
    expect(parsed.animationType).toBe('dots');
    expect(parsed.showText).toBe(true);
  });

  it('should import configuration from JSON', () => {
    const configJson = JSON.stringify({ animationType: 'linear', showText: true });
    const success = configManager.importConfig(configJson);

    expect(success).toBe(true);

    const config = configManager.getConfig();
    expect(config.animationType).toBe('linear');
    expect(config.showText).toBe(true);
  });

  it('should handle invalid JSON import', () => {
    const success = configManager.importConfig('invalid json');

    expect(success).toBe(false);
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('should persist configuration to localStorage', () => {
    configManager.updateConfig({ animationType: 'dots' });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'loading-system-config',
      expect.stringContaining('dots')
    );
  });

  it('should load persisted configuration from localStorage', () => {
    const persistedConfig = { animationType: 'pulse', showText: true };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(persistedConfig));

    // Create new instance to trigger loading
    (LoadingConfigManager as any).instance = undefined;
    const newManager = LoadingConfigManager.getInstance();

    const config = newManager.getConfig();
    expect(config.animationType).toBe('pulse');
    expect(config.showText).toBe(true);
  });

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    // Should not throw error
    (LoadingConfigManager as any).instance = undefined;
    const newManager = LoadingConfigManager.getInstance();

    expect(newManager.getConfig()).toEqual(DEFAULT_LOADING_CONFIG);
    expect(mockConsoleWarn).toHaveBeenCalled();
  });

  it('should handle listener errors gracefully', () => {
    const faultyListener = jest.fn(() => {
      throw new Error('Listener error');
    });

    configManager.subscribe(faultyListener);
    configManager.updateConfig({ animationType: 'dots' });

    // Should not throw error and should log the error
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('should validate string length constraints', () => {
    const longText = 'a'.repeat(200); // Exceeds maxLength of 100
    const validation = configManager.validateConfig({ customText: longText });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      expect.stringContaining('must be at most 100 characters')
    );
  });

  it('should validate number range constraints', () => {
    const validation = configManager.validateConfig({
      minDisplayTime: -50, // Below minimum
      maxDisplayTime: 50000 // Above maximum
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should handle configuration merging correctly', () => {
    const baseConfig = configManager.getConfig();
    configManager.updateConfig({ animationType: 'dots' });

    const updatedConfig = configManager.getConfig();

    // Should preserve other properties
    expect(updatedConfig.minDisplayTime).toBe(baseConfig.minDisplayTime);
    expect(updatedConfig.maxDisplayTime).toBe(baseConfig.maxDisplayTime);

    // Should update specified property
    expect(updatedConfig.animationType).toBe('dots');
  });
});

// Cleanup mocks
afterAll(() => {
  mockConsoleLog.mockRestore();
  mockConsoleWarn.mockRestore();
  mockConsoleError.mockRestore();
});