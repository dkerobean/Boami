'use client';

import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(dashboard)/layout/shared/breadcrumb/Breadcrumb';
import FeatureGatingExample from '@/app/components/examples/FeatureGatingExample';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Feature Gating Demo',
  },
];

const FeatureGatingPage: React.FC = () => {
  return (
    <PageContainer title="Feature Gating Demo" description="Demonstration of subscription-based feature access control">
      <Breadcrumb title="Feature Gating Demo" items={BCrumb} />
      <FeatureGatingExample />
    </PageContainer>
  );
};

export default FeatureGatingPage;