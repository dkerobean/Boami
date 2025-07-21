import { useEffect } from 'react';

interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    const metrics: PerformanceMetrics = {};

    // Measure Core Web Vitals
    const measureWebVitals = () => {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.lcp = lastEntry.startTime;

            // Report to analytics if available
            if (window.gtag) {
              window.gtag('event', 'web_vitals', {
                event_category: 'performance',
                metric_name: 'LCP',
                metric_value: Math.round(lastEntry.startTime),
                metric_rating: lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs_improvement' : 'poor'
              });
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay (FID)
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              metrics.fid = entry.processingStart - entry.startTime;

              if (window.gtag) {
                window.gtag('event', 'web_vitals', {
                  event_category: 'performance',
                  metric_name: 'FID',
                  metric_value: Math.round(entry.processingStart - entry.startTime),
                  metric_rating: (entry.processingStart - entry.startTime) <= 100 ? 'good' : (entry.processingStart - entry.startTime) <= 300 ? 'needs_improvement' : 'poor'
                });
              }
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Cumulative Layout Shift (CLS)
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            metrics.cls = clsValue;

            if (window.gtag) {
              window.gtag('event', 'web_vitals', {
                event_category: 'performance',
                metric_name: 'CLS',
                metric_value: Math.round(clsValue * 1000) / 1000,
                metric_rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs_improvement' : 'poor'
              });
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // First Contentful Paint (FCP)
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              metrics.fcp = entry.startTime;

              if (window.gtag) {
                window.gtag('event', 'web_vitals', {
                  event_category: 'performance',
                  metric_name: 'FCP',
                  metric_value: Math.round(entry.startTime),
                  metric_rating: entry.startTime <= 1800 ? 'good' : entry.startTime <= 3000 ? 'needs_improvement' : 'poor'
                });
              }
            });
          });
          fcpObserver.observe({ entryTypes: ['paint'] });

        } catch (error) {
          console.warn('Performance monitoring not supported:', error);
        }
      }

      // Time to First Byte (TTFB)
      if (performance.timing) {
        const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
        metrics.ttfb = ttfb;

        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            event_category: 'performance',
            metric_name: 'TTFB',
            metric_value: ttfb,
            metric_rating: ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs_improvement' : 'poor'
          });
        }
      }
    };

    // Measure page load performance
    const measurePageLoad = () => {
      if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        const domContentLoaded = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;

        if (window.gtag) {
          window.gtag('event', 'page_performance', {
            event_category: 'performance',
            page_load_time: loadTime,
            dom_content_loaded: domContentLoaded
          });
        }
      }
    };

    // Measure resource loading
    const measureResources = () => {
      if (performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource');
        const slowResources = resources.filter((resource: any) => resource.duration > 1000);

        if (slowResources.length > 0 && window.gtag) {
          window.gtag('event', 'slow_resources', {
            event_category: 'performance',
            slow_resource_count: slowResources.length
          });
        }
      }
    };

    // Run measurements
    measureWebVitals();

    // Measure page load after window loads
    if (document.readyState === 'complete') {
      measurePageLoad();
      measureResources();
    } else {
      window.addEventListener('load', () => {
        measurePageLoad();
        measureResources();
      });
    }

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.log('Performance Metrics:', metrics);
      }, 3000);
    }

  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;