'use client';

import React from 'react';
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { RecurringPaymentList } from '@/app/components/apps/finance/recurring';

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Recurring Payments",
  },
];

const RecurringPaymentsPage = () => {
  return (
    <PageContainer title="Recurring Payments" description="Manage your recurring income and expense payments">
      <Breadcrumb title="Recurring Payments" items={BCrumb} />
      <RecurringPaymentList />
    </PageContainer>
  );
};

export default RecurringPaymentsPage;