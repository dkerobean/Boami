'use client';

import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import QuickStats from "@/app/components/apps/ecommerce/shopManagement/QuickStats";
import ManagementActions from "@/app/components/apps/ecommerce/shopManagement/ManagementActions";
import ShopOverview from "@/app/components/apps/ecommerce/shopManagement/ShopOverview";
import ProductTableList from "@/app/components/apps/ecommerce/ProductTableList/ProductTableList";
import BlankCard from "@/app/components/shared/BlankCard";

const BCrumb = [
  {
    to: "/dashboards/ecommerce",
    title: "Dashboard",
  },
  {
    title: "Shop Management",
  },
];

const ShopManagement = () => {
  const [searchValue, setSearchValue] = useState('');
  const [statsData, setStatsData] = useState({
    totalProducts: 0,
    alertsCount: 0,
  });

  useEffect(() => {
    // Fetch stats from the same API that QuickStats uses
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/shop-management/stats');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStatsData({
              totalProducts: result.data.totalProducts || 0,
              alertsCount: result.data.activeAlerts || 0,
            });
          } else {
            console.error('Shop management stats API error:', result.error);
            setStatsData({
              totalProducts: 0,
              alertsCount: 0,
            });
          }
        } else {
          console.error('Shop management stats API request failed');
          setStatsData({
            totalProducts: 0,
            alertsCount: 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch shop management stats:', error);
        setStatsData({
          totalProducts: 0,
          alertsCount: 0,
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <PageContainer 
      title="Shop Management" 
      description="Manage your ecommerce products, inventory, and sales"
    >
      {/* Breadcrumb */}
      <Breadcrumb title="Shop Management" items={BCrumb} />
      
      {/* Quick Stats Overview */}
      <QuickStats />
      
      {/* Management Actions Bar */}
      <ManagementActions
        onSearchChange={setSearchValue}
        searchValue={searchValue}
        totalProducts={statsData.totalProducts}
        alertsCount={statsData.alertsCount}
      />
      
      {/* Shop Overview Dashboard */}
      <Box mb={3}>
        <ShopOverview />
      </Box>
      
      {/* Products Management Table */}
      <BlankCard>
        <ProductTableList searchValue={searchValue} />
      </BlankCard>
    </PageContainer>
  );
};

export default ShopManagement;
