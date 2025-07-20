'use client';

import React from 'react';
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { IncomeList } from '@/app/components/apps/finance/income';

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Income Management",
  },
];

const IncomePage = () => {
  return (
    <PageContainer title="Income Management" description="Manage your income records">
      <Breadcrumb title="Income Management" items={BCrumb} />
      <IncomeList />
    </PageContainer>
  );
};

export default IncomePage;