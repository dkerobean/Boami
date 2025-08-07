'use client';

import React from 'react';
import Breadcrumb from "@/app/(dashboard)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { SalesList } from '@/app/components/apps/finance/sales';

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Sales Management",
  },
];

const SalesPage = () => {
  return (
    <PageContainer title="Sales Management" description="Manage your sales records">
      <Breadcrumb title="Sales Management" items={BCrumb} />
      <SalesList />
    </PageContainer>
  );
};

export default SalesPage;