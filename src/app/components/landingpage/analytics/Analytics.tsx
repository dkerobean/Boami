import React, { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    hj: (...args: any[]) => void;
  }
}

interface AnalyticsProps {
  googleAnalyticsId?: string;
  hotjarId?: string;
  enableTracking?: boolean;
}

const Analytics: React.FC<AnalyticsProps> = ({
  googleAnalyticsId = 'G-XXXXXXXXXX', // Replace with actual GA4 ID
  hotjarId = '1234567', // Replace with actual Hotjar ID
  enableTracking = true
}) => {
  useEffect(() => {
    if (!enableTracking) return;

    // Track page view
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', googleAnalyticsId, {
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, [googleAnalyticsId, enableTracking]);

  // Track conversion events
  const trackConversion = (eventName: string, parameters?: Record<string, any>) => {
    if (!enableTracking || typeof window === 'undefined' || !window.gtag) return;

    window.gtag('event', eventName, {
      event_category: 'conversion',
      event_label: 'landing_page',
      ...parameters
    });
  };

  // Track CTA clicks
  const trackCTAClick = (ctaType: string, location: string) => {
    trackConversion('cta_click', {
      cta_type: ctaType,
      cta_location: location
    });
  };

  // Track form submissions
  const trackFormSubmission = (formType: string) => {
    trackConversion('form_submit', {
      form_type: formType
    });
  };

  // Track scroll depth
  useEffect(() => {
    if (!enableTracking || typeof window === 'undefined') return;

    let maxScroll = 0;
    const trackScrollDepth = () => {
      try {
        if (!document.documentElement) return;
        
        const scrollPercent = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );

        if (scrollPercent > maxScroll && scrollPercent % 25 === 0 && scrollPercent <= 100) {
          maxScroll = scrollPercent;
          trackConversion('scroll_depth', {
            scroll_percent: scrollPercent
          });
        }
      } catch (error) {
        console.warn('Scroll tracking error:', error);
      }
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', trackScrollDepth, { passive: true });
    
    return () => {
      try {
        window.removeEventListener('scroll', trackScrollDepth);
      } catch (error) {
        console.warn('Error removing scroll listener:', error);
      }
    };
  }, [enableTracking]);

  if (!enableTracking) return null;

  return (
    <>
      {/* Google Analytics 4 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${googleAnalyticsId}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </Script>

      {/* Hotjar Tracking - Using Script component to avoid DOM manipulation */}
      <Script
        id="hotjar-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.hj = window.hj || function(){(window.hj.q=window.hj.q||[]).push(arguments)};
            window._hjSettings = {hjid:${hotjarId}, hjsv:6};
          `
        }}
      />
      <Script
        src={`https://static.hotjar.com/c/hotjar-${hotjarId}.js?sv=6`}
        strategy="afterInteractive"
      />
    </>
  );
};

// Export tracking functions for use in components
export const useAnalytics = () => {
  const trackCTAClick = (ctaType: string, location: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'cta_click', {
        event_category: 'conversion',
        event_label: 'landing_page',
        cta_type: ctaType,
        cta_location: location
      });
    }
  };

  const trackFormSubmission = (formType: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'form_submit', {
        event_category: 'conversion',
        event_label: 'landing_page',
        form_type: formType
      });
    }
  };

  const trackSectionView = (sectionName: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'section_view', {
        event_category: 'engagement',
        event_label: sectionName
      });
    }
  };

  return {
    trackCTAClick,
    trackFormSubmission,
    trackSectionView
  };
};

export default Analytics;