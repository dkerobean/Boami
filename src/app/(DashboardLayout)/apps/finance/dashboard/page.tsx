'use client';

import React from 'react';
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { FinanceDashboard } from '@/app/components/apps/finance/dashboard';

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Finance Dashboard",
  },
];

const FinanceDashboardPage = () => {
  return (
    <PageContainer title="Finance Dashboard" description="Financial overview and analytics">
      <Breadcrumb title="Finance Dashboard" items={BCrumb} />
      <FinanceDashboard />
    </PageContainer>
  );
};

export default FinanceDashboardPage;