import {
  mergeLoadingConfig,
  hasMinimumTimeElapsed,
  hasMaximumTimeExceeded,
  getAnimationDuration,
  validateLoadingConfig,
  debounce,
} from '@/app/components/shared/loading/utils';
import { DEFAULT_LOADING_CONFIG } from '@/app/components/shared/loading/constants';

describe('Loading Utils', () => {
  describe('mergeLoadingConfig', () => {
    it('should return default config when no config provided', () => {
      const result = mergeLoadingConfig();
      expect(result).toEqual(DEFAULT_LOADING_CONFIG);
    });

    it('should merge custom config with defaults', () => {
      const customConfig = { animationType: 'dots' as const, showText: true };
      const result = mergeLoadingConfig(customConfig);

      expect(result).toEqual({
        ...DEFAULT_LOADING_CONFIG,
        ...customConfig,
      });
    });
  });

  describe('hasMinimumTimeElapsed', () => {
    it('should return true when startTime is null', () => {
      expect(hasMinimumTimeElapsed(null, 200)).toBe(true);
    });

    it('should return true when minimum time has elapsed', () => {
      const startTime = Date.now() - 300;
      expect(hasMinimumTimeElapsed(startTime, 200)).toBe(true);
    });

    it('should return false when minimum time has not elapsed', () => {
      const startTime = Date.now() - 100;
      expect(hasMinimumTimeElapsed(startTime, 200)).toBe(false);
    });
  });

  describe('hasMaximumTimeExceeded', () => {
    it('should return false when startTime is null', () => {
      expect(hasMaximumTimeExceeded(null, 5000)).toBe(false);
    });

    it('should return true when maximum time has been exceeded', () => {
      const startTime = Date.now() - 6000;
      expect(hasMaximumTimeExceeded(startTime, 5000)).toBe(true);
    });

    it('should return false when maximum time has not been exceeded', () => {
      const startTime = Date.now() - 3000;
      expect(hasMaximumTimeExceeded(startTime, 5000)).toBe(false);
    });
  });

  describe('getAnimationDuration', () => {
    it('should return correct duration for each animation type', () => {
      expect(getAnimationDuration('circular')).toBe(1000);
      expect(getAnimationDuration('linear')).toBe(2000);
      expect(getAnimationDuration('dots')).toBe(600);
      expect(getAnimationDuration('pulse')).toBe(1000);
      expect(getAnimationDuration('unknown')).toBe(1000);
    });
  });

  describe('validateLoadingConfig', () => {
    it('should return true for valid config', () => {
      const validConfig = {
        minDisplayTime: 200,
        maxDisplayTime: 5000,
        fadeOutDuration: 150,
      };
      expect(validateLoadingConfig(validConfig)).toBe(true);
    });

    it('should return false for negative minDisplayTime', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidConfig = { minDisplayTime: -100 };

      expect(validateLoadingConfig(invalidConfig)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[Loading System] minDisplayTime cannot be negative');

      consoleSpy.mockRestore();
    });

    it('should return false when minDisplayTime > maxDisplayTime', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidConfig = { minDisplayTime: 6000, maxDisplayTime: 5000 };

      expect(validateLoadingConfig(invalidConfig)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[Loading System] minDisplayTime cannot be greater than maxDisplayTime');

      consoleSpy.mockRestore();
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('test1');
      debouncedFn('test2');
      debouncedFn('test3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test3');
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });
});