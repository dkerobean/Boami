import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ABTest {
  id: string;
  name: string;
  variants: {
    id: string;
    name: string;
    weight: number; // Percentage of traffic (0-100)
  }[];
  isActive: boolean;
}

interface ABTestContextType {
  getVariant: (testId: string) => string | null;
  trackConversion: (testId: string, conversionType: string) => void;
  isVariant: (testId: string, variantId: string) => boolean;
}

const ABTestContext = createContext<ABTestContextType | undefined>(undefined);

// Define your A/B tests here
const AB_TESTS: ABTest[] = [
  {
    id: 'hero_cta_text',
    name: 'Hero CTA Button Text',
    variants: [
      { id: 'control', name: 'Start Free Trial', weight: 50 },
      { id: 'variant_a', name: 'Get Started Free', weight: 50 }
    ],
    isActive: true
  },
  {
    id: 'pricing_highlight',
    name: 'Pricing Section Highlight',
    variants: [
      { id: 'control', name: 'Most Popular Badge', weight: 50 },
      { id: 'variant_a', name: 'Best Value Badge', weight: 50 }
    ],
    isActive: true
  },
  {
    id: 'testimonial_layout',
    name: 'Testimonial Section Layout',
    variants: [
      { id: 'control', name: 'Carousel Layout', weight: 50 },
      { id: 'variant_a', name: 'Grid Layout', weight: 50 }
    ],
    isActive: false // Disabled for now
  }
];

interface ABTestProviderProps {
  children: ReactNode;
}

export const ABTestProvider: React.FC<ABTestProviderProps> = ({ children }) => {
  const [userVariants, setUserVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize user variants on client side only
    if (typeof window === 'undefined') return;

    const storedVariants = localStorage.getItem('ab_test_variants');
    let variants: Record<string, string> = {};

    if (storedVariants) {
      try {
        variants = JSON.parse(storedVariants);
      } catch (error) {
        console.warn('Failed to parse stored A/B test variants:', error);
      }
    }

    // Assign variants for new tests or missing variants
    AB_TESTS.forEach(test => {
      if (!test.isActive) return;

      if (!variants[test.id]) {
        // Assign variant based on weights
        const random = Math.random() * 100;
        let cumulativeWeight = 0;

        for (const variant of test.variants) {
          cumulativeWeight += variant.weight;
          if (random <= cumulativeWeight) {
            variants[test.id] = variant.id;
            break;
          }
        }
      }
    });

    setUserVariants(variants);
    localStorage.setItem('ab_test_variants', JSON.stringify(variants));

    // Track test assignments
    Object.entries(variants).forEach(([testId, variantId]) => {
      if (window.gtag) {
        window.gtag('event', 'ab_test_assignment', {
          event_category: 'ab_testing',
          test_id: testId,
          variant_id: variantId
        });
      }
    });
  }, []);

  const getVariant = (testId: string): string | null => {
    const test = AB_TESTS.find(t => t.id === testId);
    if (!test || !test.isActive) return null;

    return userVariants[testId] || null;
  };

  const isVariant = (testId: string, variantId: string): boolean => {
    return getVariant(testId) === variantId;
  };

  const trackConversion = (testId: string, conversionType: string) => {
    const variant = getVariant(testId);
    if (!variant) return;

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'ab_test_conversion', {
        event_category: 'ab_testing',
        test_id: testId,
        variant_id: variant,
        conversion_type: conversionType
      });
    }
  };

  const contextValue: ABTestContextType = {
    getVariant,
    trackConversion,
    isVariant
  };

  return (
    <ABTestContext.Provider value={contextValue}>
      {children}
    </ABTestContext.Provider>
  );
};

export const useABTest = (): ABTestContextType => {
  const context = useContext(ABTestContext);
  if (context === undefined) {
    throw new Error('useABTest must be used within an ABTestProvider');
  }
  return context;
};

// Helper hook for specific tests
export const useABTestVariant = (testId: string) => {
  const { getVariant, isVariant, trackConversion } = useABTest();

  return {
    variant: getVariant(testId),
    isVariant: (variantId: string) => isVariant(testId, variantId),
    trackConversion: (conversionType: string) => trackConversion(testId, conversionType)
  };
};