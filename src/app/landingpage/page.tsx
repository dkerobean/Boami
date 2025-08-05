"use client"

import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';

// Updated components for e-commerce management platform
import LpHeader from '@/app/components/landingpage/header/Header';
import HeroSection from '@/app/components/landingpage/hero/HeroSection';
import ProblemSolutionSection from '@/app/components/landingpage/problem-solution/ProblemSolutionSection';
import FeaturesSection from '@/app/components/landingpage/features/FeaturesSection';
import SocialProofSection from '@/app/components/landingpage/social-proof/SocialProofSection';
import Testimonial from '@/app/components/landingpage/testimonial/Testimonial';
import PricingSection from '@/app/components/landingpage/pricing/PricingSection';
import FAQSection from '@/app/components/landingpage/faq/FAQSection';
import Footer from '@/app/components/landingpage/footer/Footer';

// Performance and optimization components
import Analytics from '@/app/components/landingpage/analytics/Analytics';
import PerformanceMonitor from '@/app/components/landingpage/performance/PerformanceMonitor';
import AccessibilityEnhancements from '@/app/components/landingpage/accessibility/AccessibilityEnhancements';
import { ABTestProvider } from '@/app/components/landingpage/testing/ABTestProvider';
import LandingPageTests from '@/app/components/landingpage/testing/LandingPageTests';

export default function LandingPage() {
  return (
    <ABTestProvider>
      {/* Performance and Analytics Components */}
      <Analytics enableTracking={process.env.NODE_ENV === 'production'} />
      <PerformanceMonitor />
      <AccessibilityEnhancements />

      <PageContainer
        title="BOAMI - E-commerce Management Platform"
        description="Complete e-commerce management platform with inventory, orders, CRM, and AI analytics"
      >
        <main id="main-content">
          {/* Header with Navigation */}
          <LpHeader />

          {/* Hero Section - Main value proposition */}
          <HeroSection />

          {/* Problem/Solution Section - Address pain points */}
          <ProblemSolutionSection />

          {/* Features Section - Core platform capabilities */}
          <FeaturesSection />

          {/* Social Proof Section - Customer testimonials and success metrics */}
          <SocialProofSection />

          {/* Enhanced Testimonials Section */}
          <Testimonial />

          {/* Pricing Section - Transparent, tiered pricing */}
          <PricingSection />

          {/* FAQ Section - Address common objections */}
          <FAQSection />

          {/* Footer - Additional resources and contact */}
          <Footer />
        </main>
      </PageContainer>

      {/* Development Testing Tools */}
      <LandingPageTests />
    </ABTestProvider>
  );
}

LandingPage.layout = "Blank";
