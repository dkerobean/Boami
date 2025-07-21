import React from 'react';
import Head from 'next/head';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: object;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "BOAMI - Complete E-commerce Management Platform | Inventory, Orders, CRM & Analytics",
  description = "Streamline your e-commerce business with BOAMI's all-in-one platform. Manage inventory, process orders, track customers, and gain AI-powered insights. Start your free trial today.",
  keywords = [
    "e-commerce management",
    "inventory management",
    "order processing",
    "CRM",
    "business analytics",
    "AI insights",
    "e-commerce platform",
    "business management software"
  ],
  ogImage = "/images/og-image-boami.jpg",
  canonicalUrl = "https://boami.com",
  structuredData
}) => {
  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="BOAMI" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />

      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="BOAMI" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#1976d2" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
};

export default SEOHead;