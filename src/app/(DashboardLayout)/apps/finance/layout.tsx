'use client';

import React from 'react';
import { Box } from '@mui/material';

interface FinanceLayoutProps {
  children: React.ReactNode;
}

const FinanceLayout: React.FC<FinanceLayoutProps> = ({ children }) => {
  // This layout can be used to add common elements to all finance pages
  // such as authentication checks, common headers, or breadcrumbs

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {children}
    </Box>
  );
};

export default FinanceLayout;