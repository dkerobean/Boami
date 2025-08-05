import { Metadata } from 'next';

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

export const metadata: Metadata = {
  title: 'BOAMI - Complete E-commerce Management Platform | Inventory, Orders, CRM & Analytics',
  description: 'Streamline your e-commerce business with BOAMI\'s all-in-one platform. Manage inventory, process orders, track customers, and gain AI-powered insights. Start your free trial today.',
  keywords: [
    'e-commerce management',
    'inventory management', 
    'order processing',
    'CRM',
    'business analytics',
    'AI insights',
    'e-commerce platform',
    'business management software'
  ],
  authors: [{ name: 'BOAMI' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'BOAMI - Complete E-commerce Management Platform',
    description: 'Streamline your e-commerce business with BOAMI\'s all-in-one platform. Manage inventory, process orders, track customers, and gain AI-powered insights.',
    type: 'website',
    url: 'https://boami.com',
    siteName: 'BOAMI',
    images: [
      {
        url: '/images/og-image-boami.jpg',
        width: 1200,
        height: 630,
        alt: 'BOAMI E-commerce Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BOAMI - Complete E-commerce Management Platform',
    description: 'Streamline your e-commerce business with BOAMI\'s all-in-one platform. Start your free trial today.',
    images: ['/images/twitter-card-boami.jpg'],
  },
  alternates: {
    canonical: 'https://boami.com',
  },
  other: {
    'application-ld+json': JSON.stringify(structuredData),
  },
};

export default function LandingPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
    </>
  );
}