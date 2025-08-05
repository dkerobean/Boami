import React from "react";
import { Providers } from "@/store/providers";
import MyApp from "./app";
import "./global.css";
import { startupInit } from "./startup";
import NavigationLoadingIndicator from "./components/shared/loading/NavigationLoadingIndicator";


export const metadata = {
  title: "BOAMI",
  description: "BOAMI is a comprehensive e-commerce management platform built with Next.js 14, TypeScript, and Material-UI. It provides end-to-end business management capabilities including product inventory, order processing, customer relationship management, financial analytics, and AI-powered insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize application on startup (non-blocking)
  if (typeof window === 'undefined') {
    startupInit().catch(console.error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NavigationLoadingIndicator />
        <Providers>
          <MyApp>{children}</MyApp>
        </Providers>
      </body>
    </html>
  );
}
