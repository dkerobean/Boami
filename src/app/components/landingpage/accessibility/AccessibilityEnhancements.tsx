import React, { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

const AccessibilityEnhancements: React.FC = () => {
  const theme = useTheme();

  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const elementsToCleanup: Element[] = [];
    const eventListenersToCleanup: Array<{ element: Element; event: string; handler: EventListener }> = [];

    // Skip link for keyboard navigation
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: ${theme.palette.primary.main};
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 9999;
      transition: top 0.3s;
    `;
    
    const handleSkipLinkFocus = () => {
      skipLink.style.top = '6px';
    };
    
    const handleSkipLinkBlur = () => {
      skipLink.style.top = '-40px';
    };

    skipLink.addEventListener('focus', handleSkipLinkFocus);
    skipLink.addEventListener('blur', handleSkipLinkBlur);
    
    eventListenersToCleanup.push(
      { element: skipLink, event: 'focus', handler: handleSkipLinkFocus },
      { element: skipLink, event: 'blur', handler: handleSkipLinkBlur }
    );

    try {
      document.body.insertBefore(skipLink, document.body.firstChild);
      elementsToCleanup.push(skipLink);
    } catch (error) {
      console.warn('Error adding skip link:', error);
    }

    // Announce page changes to screen readers
    const announcePageChange = () => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      announcement.textContent = 'Page content updated';
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    };

    // Focus management for modals and dynamic content
    const manageFocus = () => {
      // Store the last focused element
      let lastFocusedElement: HTMLElement | null = null;

      // Function to trap focus within a container
      const trapFocus = (container: HTMLElement) => {
        const focusableElements = container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0] as HTMLElement;
        const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

        container.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
              }
            }
          }
        });
      };

      // Return focus to the last focused element
      const returnFocus = () => {
        if (lastFocusedElement) {
          lastFocusedElement.focus();
        }
      };

      return { trapFocus, returnFocus };
    };

    // Keyboard navigation enhancements
    const enhanceKeyboardNavigation = () => {
      // Add visible focus indicators
      const style = document.createElement('style');
      style.textContent = `
        *:focus-visible {
          outline: 2px solid ${theme.palette.primary.main} !important;
          outline-offset: 2px !important;
        }

        .sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }
      `;
      document.head.appendChild(style);

      // Handle escape key for closing modals/dropdowns
      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          // Close any open modals or dropdowns
          const openModals = document.querySelectorAll('[role="dialog"][aria-hidden="false"]');
          openModals.forEach((modal) => {
            const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLElement;
            if (closeButton) {
              closeButton.click();
            }
          });
        }
      };

      document.addEventListener('keydown', handleEscapeKey);
      eventListenersToCleanup.push({ element: document as any, event: 'keydown', handler: handleEscapeKey });
    };

    // Color contrast and readability enhancements
    const enhanceReadability = () => {
      // Check for user's color scheme preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Apply reduced motion styles if user prefers
      if (prefersReducedMotion) {
        const style = document.createElement('style');
        style.textContent = `
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        `;
        document.head.appendChild(style);
      }

      // High contrast mode detection and adjustments
      const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
      if (highContrast) {
        const style = document.createElement('style');
        style.textContent = `
          * {
            border-color: currentColor !important;
          }

          button, input, select, textarea {
            border: 2px solid currentColor !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    // ARIA live regions for dynamic content
    const setupLiveRegions = () => {
      // Create polite live region for non-urgent updates
      const politeRegion = document.createElement('div');
      politeRegion.setAttribute('aria-live', 'polite');
      politeRegion.setAttribute('aria-atomic', 'false');
      politeRegion.id = 'polite-live-region';
      politeRegion.className = 'sr-only';
      
      try {
        document.body.appendChild(politeRegion);
        elementsToCleanup.push(politeRegion);
      } catch (error) {
        console.warn('Error adding polite live region:', error);
      }

      // Create assertive live region for urgent updates
      const assertiveRegion = document.createElement('div');
      assertiveRegion.setAttribute('aria-live', 'assertive');
      assertiveRegion.setAttribute('aria-atomic', 'true');
      assertiveRegion.id = 'assertive-live-region';
      assertiveRegion.className = 'sr-only';
      
      try {
        document.body.appendChild(assertiveRegion);
        elementsToCleanup.push(assertiveRegion);
      } catch (error) {
        console.warn('Error adding assertive live region:', error);
      }
    };

    // Initialize all accessibility enhancements
    announcePageChange();
    manageFocus();
    enhanceKeyboardNavigation();
    enhanceReadability();
    setupLiveRegions();

    // Cleanup function
    return () => {
      try {
        // Remove all created elements
        elementsToCleanup.forEach(element => {
          if (element && element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });

        // Remove all event listeners
        eventListenersToCleanup.forEach(({ element, event, handler }) => {
          try {
            element.removeEventListener(event, handler);
          } catch (error) {
            console.warn('Error removing event listener:', error);
          }
        });

        // Remove live regions specifically
        const politeRegion = document.getElementById('polite-live-region');
        const assertiveRegion = document.getElementById('assertive-live-region');
        if (politeRegion && politeRegion.parentNode) {
          politeRegion.parentNode.removeChild(politeRegion);
        }
        if (assertiveRegion && assertiveRegion.parentNode) {
          assertiveRegion.parentNode.removeChild(assertiveRegion);
        }
      } catch (error) {
        console.warn('Error during accessibility cleanup:', error);
      }
    };
  }, [theme]);

  return null; // This component doesn't render anything visible
};

// Utility function to announce messages to screen readers
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const regionId = priority === 'polite' ? 'polite-live-region' : 'assertive-live-region';
  const region = document.getElementById(regionId);

  if (region) {
    region.textContent = message;
    // Clear the message after a short delay to allow for re-announcements
    setTimeout(() => {
      region.textContent = '';
    }, 1000);
  }
};

export default AccessibilityEnhancements;