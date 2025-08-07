'use client';

import React from 'react';
import Breadcrumb from "@/app/(dashboard)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { CategoryManagement } from '@/app/components/apps/finance/categories';

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Category Management",
  },
];

const CategoriesPage = () => {
  return (
    <PageContainer title="Category Management" description="Manage income and expense categories">
      <Breadcrumb title="Category Management" items={BCrumb} />
      <CategoryManagement />
    </PageContainer>
  );
};

export default CategoriesPage;