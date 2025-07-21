import { LandingPageContent } from '@/types/landing-page';

export const landingPageContent: LandingPageContent = {
  meta: {
    title: "BOAMI - Complete E-commerce Management Platform | Inventory, Orders, CRM & Analytics",
    description: "Streamline your e-commerce business with BOAMI's all-in-one platform. Manage inventory, process orders, track customers, and gain AI-powered insights. Start your free trial today.",
    keywords: [
      "e-commerce management",
      "inventory management",
      "order processing",
      "CRM",
      "business analytics",
      "AI insights",
      "e-commerce platform",
      "business management software"
    ],
    ogImage: "/images/og-image-boami.jpg"
  },

  hero: {
    headline: "Complete E-commerce Management Platform",
    subheadline: "Streamline your entire business with BOAMI's all-in-one platform. Manage inventory, process orders, nurture customers, and gain AI-powered insights to grow your e-commerce business.",
    ctaPrimary: "Start Free Trial",
    ctaSecondary: "Request Demo",
    backgroundAnimation: {
      images: [
        "/images/landingpage/bannerimg1.svg",
        "/images/landingpage/bannerimg2.svg"
      ],
      config: {
        type: 'scrolling-images',
        images: [
          "/images/landingpage/bannerimg1.svg",
          "/images/landingpage/bannerimg2.svg"
        ],
        speed: 35,
        direction: 'up'
      }
    }
  },

  features: [
    {
      id: "inventory-management",
      title: "Smart Inventory Management",
      description: "Take control of your stock with real-time tracking, automated reord and intelligent forecasting that prevents stockouts and overstock situations.",
      benefits: [
        "Real-time stock level monitoring across all channels",
        "Automated low-stock alerts and reorder suggestions",
        "AI-powered demand forecasting and trend analysis",
        "Multi-warehouse management and tracking",
        "Barcode scanning and SKU management"
      ],
      icon: "📦",
      screenshot: "/images/screenshots/inventory-dashboard.png"
    },
    {
      id: "order-processing",
      title: "Streamlined Order Processing",
      description: "Process orders faster and more accurately with automated workflows, integrated shipping, and real-time order tracking that delights customers.",
      benefits: [
        "Automated order routing and fulfillment workflows",
        "Integrated shipping labels and tracking",
        "Multi-channel order consolidation",
        "Customer notification automation",
        "Returns and refund management"
      ],
      icon: "🚚",
      screenshot: "/images/screenshots/order-processing.png"
    },
    {
      id: "customer-management",
      title: "Powerful CRM & Customer Insights",
      description: "Build stronger customer relationships with comprehensive profiles, purchase history, and automated marketing campaigns that drive repeat business.",
      benefits: [
        "360-degree customer profiles and history",
        "Automated email marketing campaigns",
        "Customer segmentation and targeting",
        "Loyalty program management",
        "Support ticket integration"
      ],
      icon: "👥",
      screenshot: "/images/screenshots/crm-dashboard.png"
    },
    {
      id: "financial-analytics",
      title: "Advanced Financial Analytics",
      description: "Make data-driven decisions with comprehensive financial reporting, profit analysis, and cash flow forecasting that keeps your business profitable.",
      benefits: [
        "Real-time profit and loss tracking",
        "Cash flow forecasting and analysis",
        "Tax reporting and compliance tools",
        "Cost analysis and margin optimization",
        "Financial performance dashboards"
      ],
      icon: "📊",
      screenshot: "/images/screenshots/analytics-dashboard.png"
    },
    {
      id: "ai-insights",
      title: "AI-Powered Business Insights",
      description: "Unlock the power of artificial intelligence to identify trends, predict customer behavior, and optimize your business operations automatically.",
      benefits: [
        "Predictive analytics for sales forecasting",
        "Customer behavior analysis and recommendations",
        "Automated pricing optimization",
        "Market trend identification",
        "Performance anomaly detection"
      ],
      icon: "🤖",
      screenshot: "/images/screenshots/ai-insights.png"
    }
  ],

  pricing: {
    title: "Choose Your Plan",
    subtitle: "Start free and scale as you grow. All plans include our core features with no setup fees.",
    plans: [
      {
        id: "starter",
        name: "Starter",
        description: "Perfect for small businesses just getting started",
        price: {
          monthly: 29,
          annual: 290
        },
        features: [
          { name: "Up to 1,000 products", included: true },
          { name: "Up to 100 orders/month", included: true },
          { name: "Basic inventory tracking", included: true },
          { name: "Email support", included: true },
          { name: "Standard reporting", included: true },
          { name: "Multi-channel integration", included: false },
          { name: "Advanced analytics", included: false },
          { name: "AI insights", included: false },
          { name: "Priority support", included: false }
        ],
        cta: {
          text: "Start Free Trial",
          href: "/auth/auth1/register",
          variant: "outlined",
          color: "primary"
        },
        isPopular: false
      },
      {
        id: "professional",
        name: "Professional",
        description: "Ideal for growing businesses that need advanced features",
        price: {
          monthly: 79,
          annual: 790
        },
        features: [
          { name: "Up to 10,000 products", included: true },
          { name: "Up to 1,000 orders/month", included: true },
          { name: "Advanced inventory management", included: true },
          { name: "Priority email & chat support", included: true },
          { name: "Advanced reporting & analytics", included: true },
          { name: "Multi-channel integration", included: true },
          { name: "CRM & customer insights", included: true },
          { name: "Basic AI insights", included: true },
          { name: "API access", included: true }
        ],
        cta: {
          text: "Start Free Trial",
          href: "/auth/auth1/register",
          variant: "contained",
          color: "primary"
        },
        isPopular: true
      },
      {
        id: "enterprise",
        name: "Enterprise",
        description: "For large businesses with complex requirements",
        price: {
          monthly: 199,
          annual: 1990
        },
        features: [
          { name: "Unlimited products", included: true },
          { name: "Unlimited orders", included: true },
          { name: "Full platform access", included: true },
          { name: "24/7 phone & chat support", included: true },
          { name: "Custom reporting & dashboards", included: true },
          { name: "Advanced integrations", included: true },
          { name: "Full AI suite", included: true },
          { name: "Dedicated account manager", included: true },
          { name: "Custom development", included: true }
        ],
        cta: {
          text: "Contact Sales",
          href: "/contact-sales",
          variant: "outlined",
          color: "primary"
        },
        isEnterprise: true
      }
    ],
    billingToggle: {
      monthly: "Monthly",
      annual: "Annual",
      savings: "Save 17%"
    }
  },

  testimonials: [
    {
      id: "testimonial-1",
      quote: "BOAMI transformed our e-commerce operations. We reduced order processing time by 60% and increased our profit margins by 25% in just 3 months.",
      author: {
        name: "Sarah Johnson",
        title: "CEO",
        company: "TechStyle Boutique",
        avatar: "/images/testimonials/sarah-johnson.jpg"
      },
      metrics: {
        improvement: "60% faster order processing",
        timeframe: "3 months"
      }
    },
    {
      id: "testimonial-2",
      quote: "The AI insights feature is incredible. It predicted our holiday season demand perfectly, helping us avoid stockouts and maximize sales.",
      author: {
        name: "Michael Chen",
        title: "Operations Manager",
        company: "Urban Gear Co",
        avatar: "/images/testimonials/michael-chen.jpg"
      },
      metrics: {
        improvement: "95% demand forecast accuracy",
        timeframe: "6 months"
      }
    },
    {
      id: "testimonial-3",
      quote: "BOAMI's CRM helped us increase customer retention by 40%. The automated email campaigns alone paid for the platform in the first month.",
      author: {
        name: "Emily Rodriguez",
        title: "Marketing Director",
        company: "Wellness Essentials",
        avatar: "/images/testimonials/emily-rodriguez.jpg"
      },
      metrics: {
        improvement: "40% increase in retention",
        timeframe: "1 month ROI"
      }
    }
  ],

  faq: [
    {
      title: "Frequently Asked Questions",
      subtitle: "Get answers to common questions about BOAMI",
      items: [
        {
          id: "faq-1",
          question: "How long does it take to set up BOAMI?",
          answer: "Most businesses are up and running within 24 hours. Our onboarding team will help you import your existing data and configure the platform to match your workflows.",
          category: "setup"
        },
        {
          id: "faq-2",
          question: "Can BOAMI integrate with my existing tools?",
          answer: "Yes! BOAMI integrates with over 100+ popular e-commerce platforms, accounting software, shipping providers, and marketing tools. We also offer custom integrations for enterprise customers.",
          category: "integrations"
        },
        {
          id: "faq-3",
          question: "Is my data secure with BOAMI?",
          answer: "Absolutely. We use enterprise-grade security with 256-bit SSL encryption, regular security audits, and SOC 2 compliance. Your data is backed up daily and stored in secure, redundant data centers.",
          category: "security"
        },
        {
          id: "faq-4",
          question: "What kind of support do you offer?",
          answer: "We provide email support for all plans, chat support for Professional and Enterprise, and phone support for Enterprise customers. Our average response time is under 2 hours.",
          category: "support"
        },
        {
          id: "faq-5",
          question: "Can I cancel my subscription anytime?",
          answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. You'll continue to have access until the end of your billing period.",
          category: "billing"
        },
        {
          id: "faq-6",
          question: "Do you offer a free trial?",
          answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start your trial.",
          category: "trial"
        }
      ]
    }
  ]
};