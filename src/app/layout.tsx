import React from "react";
import { Providers } from "@/store/providers";
import MyApp from "./app";
import "./global.css";


export const metadata = {
  title: "BOAMI",
  description: "BOAMI is a comprehensive e-commerce management platform built with Next.js 14, TypeScript, and Material-UI. It provides end-to-end business management capabilities including product inventory, order processing, customer relationship management, financial analytics, and AI-powered insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <MyApp>{children}</MyApp>
        </Providers>
      </body>
    </html>
  );
}
