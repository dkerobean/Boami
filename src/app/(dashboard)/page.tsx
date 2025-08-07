import React from 'react';
import { Metadata } from 'next';
import PageContainer from '@/app/components/container/PageContainer';
import DashboardPageClient from './components/DashboardPageClient';

export const metadata: Metadata = {
  title: 'BOAMI Dashboard',
  description: 'Comprehensive e-commerce management dashboard with product management, analytics, and business insights.',
};

export default function Dashboard() {
  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <DashboardPageClient />
    </PageContainer>
  );
}

