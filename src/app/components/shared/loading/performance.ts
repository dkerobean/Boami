/**
 * Performance optimization utilities for the loading system
 */

import React from 'react';
import { LoadingConfig } from './types';

/**
 * Lazy loading utility for animation components
 */
export const createLazyLoadingAnimation = () => {
  return React.lazy(() => import('./LoadingAnimation'));
};

/**
 * Performance monitoring for loading system
 */
export class LoadingPerformanceMonitor {
  private static instance: LoadingPerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  public static getInstance(): LoadingPerformanceMonitor {
    if (!LoadingPerformanceMonitor.instance) {
      LoadingPerformanceMonitor.instance = new LoadingPerformanceMonitor();
    }
    return LoadingPerformanceMonitor.instance;
  }

  /**
   * Record loading performance metric
   */
  public recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }
  }

  /**
   * Get performance statistics
   */
  public getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    return {
      count: values.length,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }

  /**
   * Get all performance metrics
   */
  public getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.metrics.forEach((_, name) => {
      stats[name] = this.getStats(name);
    });

    return stats;
  }

  /**
   * Clear performance metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      // Observe paint metrics
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(`paint.${entry.name}`, entry.startTime);
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Observe navigation metrics
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordMetric('navigation.loadComplete', navEntry.loadEventEnd - navEntry.startTime);
          this.recordMetric('navigation.domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.startTime);
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

    } catch (error) {
      console.warn('[LoadingPerformanceMonitor] Failed to initialize observers:', error);
    }
  }

  /**
   * Cleanup observers
   */
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Optimize configuration for performance
 */
export const optimizeConfigForPerformance = (config: LoadingConfig): LoadingConfig => {
  const optimized = { ...config };

  // Reduce animation complexity on slower devices
  if (isSlowDevice()) {
    optimized.animationType = 'circular'; // Simplest animation
    optimized.fadeOutDuration = Math.min(optimized.fadeOutDuration || 150, 100);
  }

  // Reduce minimum display time on fast connections
  if (isFastConnection()) {
    optimized.minDisplayTime = Math.min(optimized.minDisplayTime || 200, 100);
  }

  return optimized;
};

/**
 * Check if device is considered slow
 */
export const isSlowDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  // Check device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) {
    return true;
  }

  // Check hardware concurrency
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return true;
  }

  return false;
};

/**
 * Check if connection is fast
 */
export const isFastConnection = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const connection = (navigator as any).connection;
  if (!connection) return false;

  // Consider fast if effective type is 4g or better
  return connection.effectiveType === '4g' || connection.downlink > 10;
};

/**
 * Debounced resize handler for responsive optimizations
 */
export const createOptimizedResizeHandler = (callback: () => void, delay = 250) => {
  let timeoutId: NodeJS.Timeout;

  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
};

/**
 * Memory usage monitoring
 */
export const getMemoryUsage = (): {
  used: number;
  total: number;
  percentage: number;
} | null => {
  if (typeof performance === 'undefined' || !(performance as any).memory) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
  };
};

/**
 * Check if system is under memory pressure
 */
export const isMemoryPressureHigh = (): boolean => {
  const usage = getMemoryUsage();
  return usage ? usage.percentage > 80 : false;
};

/**
 * Optimize animations based on system performance
 */
export const getOptimalAnimationSettings = (): {
  shouldUseComplexAnimations: boolean;
  recommendedFrameRate: number;
  shouldPreferCSSAnimations: boolean;
} => {
  const isSlowDev = isSlowDevice();
  const isHighMemoryPressure = isMemoryPressureHigh();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    shouldUseComplexAnimations: !isSlowDev && !isHighMemoryPressure && !prefersReducedMotion,
    recommendedFrameRate: isSlowDev ? 30 : 60,
    shouldPreferCSSAnimations: isSlowDev || isHighMemoryPressure,
  };
};