'use client'
import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Stack, Typography, Avatar, Box, Button } from '@mui/material';
import DashboardCard from '../../shared/DashboardCard';

interface PaymentGatewayStats {
  gateway: string;
  amount: number;
  percentage: number;
  transactions: number;
}

interface PaymentGatewaysProps {
  paymentStats?: PaymentGatewayStats[];
}

const PaymentGateways = ({ paymentStats = [] }: PaymentGatewaysProps) => {
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primarylight = theme.palette.primary.light;
  const error = theme.palette.error.main;
  const errorlight = theme.palette.error.light;
  const warning = theme.palette.warning.main;
  const warninglight = theme.palette.warning.light;
  const secondary = theme.palette.success.main;
  const secondarylight = theme.palette.success.light;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentMethodIcon = (gateway: string) => {
    const method = gateway.toLowerCase();
    if (method.includes('paypal')) return "/images/svgs/icon-paypal.svg";
    if (method.includes('card') || method.includes('credit') || method.includes('visa') || method.includes('mastercard')) return "/images/svgs/icon-master-card.svg";
    if (method.includes('wallet') || method.includes('digital')) return "/images/svgs/icon-office-bag.svg";
    if (method.includes('bank') || method.includes('transfer')) return "/images/svgs/icon-pie.svg";
    return "/images/svgs/icon-paypal.svg"; // default
  };

  const getPaymentMethodColor = (index: number) => {
    const colors = [
      { color: primary, lightcolor: primarylight },
      { color: secondary, lightcolor: secondarylight },
      { color: warning, lightcolor: warninglight },
      { color: error, lightcolor: errorlight },
    ];
    return colors[index % colors.length];
  };

  const getSubtitle = (gateway: string, transactions: number) => {
    return `${transactions} transaction${transactions !== 1 ? 's' : ''}`;
  };

  // Use real payment stats or fallback to default message
  const hasRealData = paymentStats && paymentStats.length > 0;
  const displayStats = hasRealData ? paymentStats.slice(0, 4) : [];

  return (
    <DashboardCard title="Payment Gateways" subtitle="Platform For Income">
      <>
        <Stack spacing={3} mt={5}>
          {hasRealData ? (
            displayStats.map((stat, i) => {
              const colors = getPaymentMethodColor(i);
              const icon = getPaymentMethodIcon(stat.gateway);
              const subtitle = getSubtitle(stat.gateway, stat.transactions);
              
              return (
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="space-between"
                  alignItems="center"
                  key={`${stat.gateway}-${i}`}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      variant="rounded"
                      sx={{ bgcolor: colors.lightcolor, color: colors.color, width: 40, height: 40 }}
                    >
                      <Avatar src={icon} alt={stat.gateway} sx={{ width: 24, height: 24 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" mb="4px">
                        {stat.gateway || 'Unknown Method'}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        {subtitle} • {stat.percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Stack>
                  <Box textAlign="right">
                    <Typography variant="subtitle2" fontWeight="600">
                      {formatCurrency(stat.amount)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {stat.percentage.toFixed(1)}% of total
                    </Typography>
                  </Box>
                </Stack>
              );
            })
          ) : (
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              minHeight={150}
              flexDirection="column"
            >
              <Typography variant="h6" color="textSecondary" mb={1}>
                No Payment Data
              </Typography>
              <Typography variant="body2" color="textSecondary" textAlign="center">
                Payment gateway statistics will appear here when transactions are processed
              </Typography>
            </Box>
          )}
          {hasRealData && (
            <Button variant="outlined" color="primary" sx={{mt: "40px !important"}}>
              View all transactions
            </Button>
          )}
        </Stack>
      </>
    </DashboardCard>
  );
};

export default PaymentGateways;
