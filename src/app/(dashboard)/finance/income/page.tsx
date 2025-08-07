'use client';

import React from 'react';
import { Box } from '@mui/material';
import PageContainer from '@/app/components/container/PageContainer';
import IncomeList from '@/app/components/apps/finance/income/IncomeList';

const IncomePage: React.FC = () => {
  return (
    <PageContainer title="Income Management" description="Manage your income records">
      <Box>
        <IncomeList />
      </Box>
    </PageContainer>
  );
};

export default IncomePage;