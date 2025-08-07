import React from 'react';
import { Metadata } from 'next';
import DashboardClient from './components/DashboardClient';

export const metadata: Metadata = {
  title: 'BOAMI Dashboard',
  description: 'Comprehensive e-commerce management dashboard with product management, analytics, and business insights.',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardClient>{children}</DashboardClient>;
}
