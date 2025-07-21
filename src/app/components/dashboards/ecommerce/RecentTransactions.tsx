'use client'
import React from 'react';
import DashboardCard from '../../shared/DashboardCard';
import {
  Timeline,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  timelineOppositeContentClasses,
} from '@mui/lab';
import { Link, Typography, Box, Chip } from '@mui/material';
import { format } from 'date-fns';

interface RecentTransaction {
  _id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: Date;
  products: string[];
}

interface RecentTransactionsProps {
  transactions?: RecentTransaction[];
}

const RecentTransactions = ({ transactions = [] }: RecentTransactionsProps) => {
  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success' as const;
      case 'pending':
        return 'warning' as const;
      case 'failed':
        return 'error' as const;
      default:
        return 'primary' as const;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <DashboardCard title="Recent Transactions">
      <>
        {transactions && transactions.length > 0 ? (
          <Timeline
            className="theme-timeline"
            nonce={undefined}
            onResize={undefined}
            onResizeCapture={undefined}
            sx={{
              p: 0,
              mb: '-40px',
              [`& .${timelineOppositeContentClasses.root}`]: {
                flex: 0.5,
                paddingLeft: 0,
              },
            }}
          >
            {transactions.slice(0, 6).map((transaction, index) => {
              const isLast = index === Math.min(transactions.length - 1, 5);
              const statusColor = getStatusColor(transaction.status);
              
              return (
                <TimelineItem key={transaction._id}>
                  <TimelineOppositeContent>
                    <Typography variant="caption" color="textSecondary">
                      {format(new Date(transaction.date), 'hh:mm a')}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      {format(new Date(transaction.date), 'MMM dd')}
                    </Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color={statusColor} variant="outlined" />
                    {!isLast && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Box>
                      <Typography fontWeight="600" variant="body2">
                        {formatCurrency(transaction.amount)} from {transaction.customerName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {transaction.customerEmail}
                      </Typography>
                      <Box mt={0.5} display="flex" alignItems="center" gap={1}>
                        <Chip 
                          size="small" 
                          label={getStatusLabel(transaction.status)}
                          color={statusColor}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.6rem' }}
                        />
                        {transaction.products && transaction.products.length > 0 && (
                          <Typography variant="caption" color="textSecondary">
                            {transaction.products.length} item(s)
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
        ) : (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            minHeight={200}
            flexDirection="column"
          >
            <Typography variant="h6" color="textSecondary" mb={1}>
              No Recent Transactions
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Transaction history will appear here
            </Typography>
          </Box>
        )}
      </>
    </DashboardCard>
  );
};

// Add loading state component for better UX
export const RecentTransactionsLoading = () => (
  <DashboardCard title="Recent Transactions">
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight={200}
    >
      <Typography variant="body2" color="textSecondary">
        Loading transactions...
      </Typography>
    </Box>
  </DashboardCard>
);

export default RecentTransactions;