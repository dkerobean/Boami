'use client';

import React from 'react';
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { VendorList } from '@/app/components/apps/finance/vendors';

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Vendor Management",
  },
];

const VendorsPage = () => {
  return (
    <PageContainer title="Vendor Management" description="Manage your vendors and suppliers">
      <Breadcrumb title="Vendor Management" items={BCrumb} />
      <VendorList />
    </PageContainer>
  );
};

export default VendorsPage;