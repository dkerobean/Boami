'use client';

import React from 'react';
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { ExpenseList } from '@/app/components/apps/finance/expense';

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Expense Management",
  },
];

const ExpensesPage = () => {
  return (
    <PageContainer title="Expense Management" description="Manage your expense records">
      <Breadcrumb title="Expense Management" items={BCrumb} />
      <ExpenseList />
    </PageContainer>
  );
};

export default ExpensesPage;