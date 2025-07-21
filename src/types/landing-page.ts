// Landing Page TypeScript Interfaces

export interface CTAButton {
  text: string;
  href: string;
  variant: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export interface NavigationItem {
  label: string;
  href: string;
  isActive?: boolean;
}

export interface HeaderProps {
  logo: string;
  navigationItems: NavigationItem[];
  ctaButton: CTAButton;
  mobileMenuToggle: boolean;
}

export interface AnimationConfig {
  type: 'scrolling-images' | 'floating-elements';
  images: string[];
  speed: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface BackgroundElement {
  id: string;
  type: 'image' | 'shape' | 'gradient';
  src?: string;
  position: {
    x: number;
    y: number;
  };
  animation?: AnimationConfig;
}

export interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: CTAButton;
  secondaryCTA: CTAButton;
  heroAnimation: AnimationConfig;
  backgroundElements: BackgroundElement[];
}

export interface FeatureMetric {
  value: string;
  label: string;
  improvement?: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  icon: string;
  screenshot?: string;
  metrics?: FeatureMetric[];
}

export interface FeaturesSectionProps {
  title: string;
  subtitle: string;
  features: Feature[];
  layout: 'grid' | 'alternating' | 'tabs';
}

export interface PricingFeature {
  name: string;
  included: boolean;
  limit?: string;
  tooltip?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  features: PricingFeature[];
  cta: CTAButton;
  isPopular?: boolean;
  isEnterprise?: boolean;
}

export interface BillingToggle {
  monthly: string;
  annual: string;
  savings?: string;
}

export interface PricingTestimonial {
  id: string;
  quote: string;
  author: string;
  company: string;
  avatar?: string;
}

export interface PricingSectionProps {
  title: string;
  subtitle: string;
  plans: PricingPlan[];
  billingToggle: BillingToggle;
  testimonials: PricingTestimonial[];
}

export interface Testimonial {
  id: string;
  quote: string;
  author: {
    name: string;
    title: string;
    company: string;
    avatar: string;
  };
  metrics?: {
    improvement: string;
    timeframe: string;
  };
}

export interface CustomerLogo {
  id: string;
  name: string;
  logo: string;
  website?: string;
}

export interface SocialMetric {
  id: string;
  value: string;
  label: string;
  description?: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  company: string;
  industry: string;
  results: string[];
  link: string;
}

export interface SocialProofProps {
  testimonials: Testimonial[];
  customerLogos: CustomerLogo[];
  metrics: SocialMetric[];
  caseStudies: CaseStudy[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface FAQContent {
  title: string;
  subtitle?: string;
  items: FAQItem[];
}

export interface HeroContent {
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  backgroundAnimation: AnimationAssets;
}

export interface AnimationAssets {
  images: string[];
  config: AnimationConfig;
}

export interface FeatureContent {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  icon: string;
  screenshot: string;
}

export interface PricingContent {
  title: string;
  subtitle: string;
  plans: PricingPlan[];
  billingToggle: BillingToggle;
}

export interface TestimonialContent {
  id: string;
  quote: string;
  author: {
    name: string;
    title: string;
    company: string;
    avatar: string;
  };
  metrics?: {
    improvement: string;
    timeframe: string;
  };
}

export interface LandingPageContent {
  meta: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };
  hero: HeroContent;
  features: FeatureContent[];
  pricing: PricingContent;
  testimonials: TestimonialContent[];
  faq: FAQContent[];
}

export interface UserInteraction {
  sessionId: string;
  timestamp: Date;
  action: 'view' | 'click' | 'scroll' | 'form_submit';
  element: string;
  section: string;
  metadata?: Record<string, any>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
  fallbackComponent: React.ComponentType;
}

export interface ABTestConfig {
  testId: string;
  variants: {
    control: ComponentVariant;
    treatment: ComponentVariant;
  };
  trafficSplit: number;
  conversionGoals: string[];
  duration: number;
}

export interface ComponentVariant {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}