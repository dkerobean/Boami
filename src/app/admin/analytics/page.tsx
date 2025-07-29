'use client';

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  UsersIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  DownloadIcon,
  RefreshCwIcon
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthContext();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  // Data state
  const [subscriptionMetrics, setSubscriptionMetrics] = useState<any>(null);
  const [paymentMetrics, setPaymentMetrics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [churnAnalysis, setChurnAnalysis] = useState<any>(null);

  // Check authentication
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?callbackUrl=/admin/analytics');
    } else if (!isLoading && user && user.role?.name !== 'admin') {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  // Fetch data
  useEffect(() => {
    if (!isLoading && user && user.role?.name === 'admin') {
      fetchAnalyticsData();
    }
  }, [isLoading, user, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [subscriptionRes, paymentRes, healthRes] = await Promise.all([
        fetch(`/api/admin/analytics/subscription-metrics?dateRange=${dateRange}&includeChurn=true&includeTrends=true`),
        fetch(`/api/admin/analytics/payment-metrics?dateRange=${dateRange}`),
        fetch('/api/admin/system/health')
      ]);

      if (!subscriptionRes.ok || !paymentRes.ok || !healthRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [subscriptionData, paymentData, healthData] = await Promise.all([
        subscriptionRes.json(),
        paymentRes.json(),
        healthRes.json()
      ]);

      if (subscriptionData.success) {
        setSubscriptionMetrics(subscriptionData.data.metrics);
        setTrends(subscriptionData.data.trends || []);
        setChurnAnalysis(subscriptionData.data.churnAnalysis);
      }

      if (paymentData.success) {
        setPaymentMetrics(paymentData.data.metrics);
      }

      if (healthData.success) {
        setSystemHealth(healthData.data);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'subscription' | 'payment', format: 'json' | 'csv') => {
    try {
      const endpoint = type === 'subscription'
        ? '/api/admin/analytics/subscription-metrics'
        : '/api/admin/analytics/payment-metrics';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateRange: parseInt(dateRange),
          exportFormat: format,
          includeChurn: true,
          includeTrends: true
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
    }
  };

  const renderSystemHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const renderTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (value < 0) {
      return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor subscription performance and system health
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchAnalyticsData} variant="outline" size="icon">
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* System Health Alert */}
        {systemHealth && systemHealth.status !== 'healthy' && (
          <Alert variant={systemHealth.status === 'critical' ? 'destructive' : 'default'}>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>System Health Alert</AlertTitle>
            <AlertDescription>
              System status: {renderSystemHealthBadge(systemHealth.status)}
              {systemHealth.alerts?.length > 0 && (
                <span className="ml-2">
                  {systemHealth.alerts.length} active alert(s)
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {/* Key Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatNumber(subscriptionMetrics?.activeSubscriptions || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatPercentage(subscriptionMetrics?.conversionRate || 0)} conversion rate
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                      <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(subscriptionMetrics?.monthlyRecurringRevenue || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        MRR (Monthly Recurring Revenue)
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
                      <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(paymentMetrics?.successRate || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(paymentMetrics?.successfulTransactions || 0)} successful payments
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                      <TrendingDownIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(subscriptionMetrics?.churnRate || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatPercentage(100 - (subscriptionMetrics?.churnRate || 0))} retention rate
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Trends Chart */}
                {trends.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Subscription Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="newSubscriptions"
                            stroke="#8884d8"
                            name="New Subscriptions"
                          />
                          <Line
                            type="monotone"
                            dataKey="cancelledSubscriptions"
                            stroke="#82ca9d"
                            name="Cancelled Subscriptions"
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#ffc658"
                            name="Revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Subscription Analytics</h2>
                  <div className="space-x-2">
                    <Button
                      onClick={() => handleExport('subscription', 'csv')}
                      variant="outline"
                      size="sm"
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => handleExport('subscription', 'json')}
                      variant="outline"
                      size="sm"
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                  </div>
                </div>

                {/* Subscription Status Distribution */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Subscription Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Active', value: subscriptionMetrics?.activeSubscriptions || 0, fill: '#8884d8' },
                              { name: 'Cancelled', value: subscriptionMetrics?.cancelledSubscriptions || 0, fill: '#82ca9d' },
                              { name: 'Expired', value: subscriptionMetrics?.expiredSubscriptions || 0, fill: '#ffc658' },
                              { name: 'Past Due', value: subscriptionMetrics?.pastDueSubscriptions || 0, fill: '#ff7300' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'Active', value: subscriptionMetrics?.activeSubscriptions || 0, fill: '#8884d8' },
                              { name: 'Cancelled', value: subscriptionMetrics?.cancelledSubscriptions || 0, fill: '#82ca9d' },
                              { name: 'Expired', value: subscriptionMetrics?.expiredSubscriptions || 0, fill: '#ffc658' },
                              { name: 'Past Due', value: subscriptionMetrics?.pastDueSubscriptions || 0, fill: '#ff7300' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Plans by Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={subscriptionMetrics?.topPlans || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="planName" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="revenue" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Churn Analysis */}
                {churnAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Churn Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Churn Reasons</h4>
                          <div className="space-y-2">
                            {churnAnalysis.churnReasons?.map((reason: any, index: number) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm">{reason.reason}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">{reason.count}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({formatPercentage(reason.percentage)})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Churn by Plan</h4>
                          <div className="space-y-2">
                            {churnAnalysis.churnByPlan?.map((plan: any, index: number) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm">{plan.planName}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">
                                    {formatPercentage(plan.churnRate)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({plan.totalCancellations} cancelled)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Payment Analytics</h2>
                  <div className="space-x-2">
                    <Button
                      onClick={() => handleExport('payment', 'csv')}
                      variant="outline"
                      size="sm"
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => handleExport('payment', 'json')}
                      variant="outline"
                      size="sm"
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                  </div>
                </div>

                {/* Payment Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                      <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatNumber(paymentMetrics?.totalTransactions || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                      <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(paymentMetrics?.successRate || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(paymentMetrics?.totalRevenue || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                      <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(paymentMetrics?.averageTransactionAmount || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue Trends */}
                {paymentMetrics?.revenueByDay?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Revenue Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={paymentMetrics.revenueByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Failure Analysis */}
                {paymentMetrics?.failureReasons?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Failure Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {paymentMetrics.failureReasons.map((reason: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm">{reason.reason}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{reason.count}</span>
                              <span className="text-xs text-muted-foreground">
                                ({formatPercentage(reason.percentage)})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">System Health</h2>
                  {renderSystemHealthBadge(systemHealth?.status || 'unknown')}
                </div>

                {/* System Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(systemHealth?.metrics?.paymentSuccessRate || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Subscription Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatNumber(systemHealth?.metrics?.subscriptionErrors || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Webhook Failures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatNumber(systemHealth?.metrics?.webhookFailures || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Alerts */}
                {systemHealth?.alerts?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Active Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {systemHealth.alerts.map((alert: any, index: number) => (
                          <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                            <AlertTriangleIcon className="h-4 w-4" />
                            <AlertTitle className="flex items-center justify-between">
                              <span>{alert.type.replace('_', ' ').toUpperCase()}</span>
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {alert.severity}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription>
                              {alert.message}
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}