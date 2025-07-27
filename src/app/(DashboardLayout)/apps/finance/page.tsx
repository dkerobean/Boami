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
    title: "Finance",
  },
];

const FinancePage = () => {
  return (
    <PageContainer title="Finance" description="Financial management and analytics">
      <Breadcrumb title="Finance" items={BCrumb} />
      <FinanceDashboard />
    </PageContainer>
  );
};

export default FinancePage;