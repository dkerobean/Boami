"use client"

import React from 'react';
import { Metadata } from 'next';
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

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BOAMI",
  "description": "Comprehensive e-commerce management platform with inventory management, order processing, CRM, financial analytics, and AI-powered insights",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free trial available"
  },
  "featureList": [
    "Product Inventory Management",
    "Order Processing & Fulfillment",
    "Customer Relationship Management",
    "Financial Analytics & Reporting",
    "AI-Powered Business Insights"
  ],
  "provider": {
    "@type": "Organization",
    "name": "BOAMI",
    "url": "https://boami.com"
  }
};

export default function LandingPage() {
  return (
    <ABTestProvider>
      {/* SEO Meta Tags */}
      <head>
        <title>BOAMI - Complete E-commerce Management Platform | Inventory, Orders, CRM & Analytics</title>
        <meta
          name="description"
          content="Streamline your e-commerce business with BOAMI's all-in-one platform. Manage inventory, process orders, track customers, and gain AI-powered insights. Start your free trial today."
        />
        <meta
          name="keywords"
          content="e-commerce management, inventory management, order processing, CRM, business analytics, AI insights, e-commerce platform, business management software"
        />

        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="BOAMI - Complete E-commerce Management Platform" />
        <meta property="og:description" content="Streamline your e-commerce business with BOAMI's all-in-one platform. Manage inventory, process orders, track customers, and gain AI-powered insights." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://boami.com" />
        <meta property="og:image" content="/images/og-image-boami.jpg" />
        <meta property="og:site_name" content="BOAMI" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BOAMI - Complete E-commerce Management Platform" />
        <meta name="twitter:description" content="Streamline your e-commerce business with BOAMI's all-in-one platform. Start your free trial today." />
        <meta name="twitter:image" content="/images/twitter-card-boami.jpg" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="BOAMI" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://boami.com" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>

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
