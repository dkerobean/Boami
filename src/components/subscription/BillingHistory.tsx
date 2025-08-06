'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  IconDownload,
  IconCalendar,
  IconCreditCard,
  IconReceipt,
  IconExternalLink
} from '@tabler/icons-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface BillingTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  description: string;
  planName?: string;
  billingPeriod?: 'monthly' | 'annual';
  reference?: string;
  invoiceUrl?: string;
  paymentMethod?: string;
}

interface BillingHistoryProps {
  userId: string;
  limit?: number;
  showPagination?: boolean;
  className?: string;
}

export default function BillingHistory({
  userId,
  limit = 10,
  showPagination = true,
  className
}: BillingHistoryProps) {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchBillingHistory();
    }
  }, [userId, currentPage, limit]);

  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userId,
        page: currentPage.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/subscriptions/billing-history?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch billing history');
      }

      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data.transactions || []);
        setTotalPages(data.data.totalPages || 1);
      } else {
        throw new Error(data.error || 'Failed to load billing history');
      }
    } catch (err: any) {
      console.error('Error fetching billing history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (transactionId: string, invoiceUrl?: string) => {
    if (!invoiceUrl) return;
    
    try {
      setDownloadingInvoice(transactionId);
      // Open invoice URL in new tab
      window.open(invoiceUrl, '_blank');
    } catch (error) {
      console.error('Error downloading invoice:', error);
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          variant: 'default' as const,
          label: 'Paid',
          color: 'text-green-600'
        };
      case 'pending':
        return {
          variant: 'secondary' as const,
          label: 'Pending',
          color: 'text-yellow-600'
        };
      case 'failed':
        return {
          variant: 'destructive' as const,
          label: 'Failed',
          color: 'text-red-600'
        };
      case 'refunded':
        return {
          variant: 'secondary' as const,
          label: 'Refunded',
          color: 'text-gray-600'
        };
      default:
        return {
          variant: 'outline' as const,
          label: 'Unknown',
          color: 'text-gray-600'
        };
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <IconReceipt className="h-5 w-5 mr-2" />
          Billing History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <IconReceipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Billing History</h3>
            <p className="text-muted-foreground">
              Your billing transactions will appear here once you make a payment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const statusInfo = getStatusInfo(transaction.status);
              
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <IconCreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{transaction.description}</h4>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <IconCalendar className="h-4 w-4 mr-1" />
                          {formatDate(transaction.date)}
                        </div>
                        
                        {transaction.reference && (
                          <div>
                            Ref: {transaction.reference}
                          </div>
                        )}
                        
                        {transaction.paymentMethod && (
                          <div className="capitalize">
                            {transaction.paymentMethod.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                      
                      {transaction.planName && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {transaction.planName} Plan
                          {transaction.billingPeriod && (
                            <span className="ml-2 capitalize">
                              ({transaction.billingPeriod} billing)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </div>
                    
                    {transaction.invoiceUrl && transaction.status === 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(transaction.id, transaction.invoiceUrl)}
                        disabled={downloadingInvoice === transaction.id}
                        className="mt-2"
                      >
                        {downloadingInvoice === transaction.id ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <IconDownload className="h-4 w-4 mr-2" />
                            Invoice
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { BillingHistory };
export type { BillingHistoryProps, BillingTransaction };