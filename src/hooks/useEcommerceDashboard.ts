'use client';

import { useState, useEffect } from 'react';
import {
  DashboardStats,
  SalesData,
  ProductPerformance,
  RecentTransaction,
  PaymentGatewayStats
} from '@/lib/services/ecommerce-dashboard';

interface EcommerceDashboardData {
  stats: DashboardStats | null;
  salesData: SalesData[];
  products: ProductPerformance[];
  transactions: RecentTransaction[];
  paymentStats: PaymentGatewayStats[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for ecommerce dashboard data
 * Fetches all dashboard data from API endpoints
 */
export const useEcommerceDashboard = () => {
  const [data, setData] = useState<EcommerceDashboardData>({
    stats: null,
    salesData: [],
    products: [],
    transactions: [],
    paymentStats: [],
    isLoading: true,
    error: null,
  });

  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch all data in parallel
      const [statsRes, salesRes, productsRes, transactionsRes, paymentsRes] = await Promise.all([
        fetch('/api/dashboard/ecommerce/stats'),
        fetch('/api/dashboard/ecommerce/sales'),
        fetch('/api/dashboard/ecommerce/products'),
        fetch('/api/dashboard/ecommerce/transactions'),
        fetch('/api/dashboard/ecommerce/payments'),
      ]);

      // Check if all requests were successful
      if (!statsRes.ok || !salesRes.ok || !productsRes.ok || !transactionsRes.ok || !paymentsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      // Parse all responses
      const [statsData, salesData, productsData, transactionsData, paymentsData] = await Promise.all([
        statsRes.json(),
        salesRes.json(),
        productsRes.json(),
        transactionsRes.json(),
        paymentsRes.json(),
      ]);

      // Update state with fetched data
      setData({
        stats: statsData.success ? statsData.data : null,
        salesData: salesData.success ? salesData.data : [],
        products: productsData.success ? productsData.data : [],
        transactions: transactionsData.success ? transactionsData.data : [],
        paymentStats: paymentsData.success ? paymentsData.data : [],
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
      }));
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh function for manual data refresh
  const refresh = () => {
    fetchDashboardData();
  };

  return {
    ...data,
    refresh,
  };
};