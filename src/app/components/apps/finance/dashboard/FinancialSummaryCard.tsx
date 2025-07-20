import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconInfoCircle
} from '@tabler/icons-react';

interface FinancialSummaryCardProps {
  title: string;
  amount: number;
  previousAmount?: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'error' | 'warning' | 'info';
  subtitle?: string;
  target?: number;
  showTrend?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  title,
  amount,
  previousAmount,
  icon,
  color,
  subtitle,
  target,
  showTrend = true,
  loading = false,
  onClick
}) => {
  // Calculate percentage change
  const getPercentageChange = () => {
    if (!previousAmount || previousAmount === 0) return 0;
    return ((amount - previousAmount) / previousAmount) * 100;
  };

  // Calculate progress towards target
  const getProgress = () => {
    if (!target || target === 0) return 0;
    return Math.min((amount / target) * 100, 100);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const percentageChange = getPercentageChange();
  const progress = getProgress();
  const isPositiveChange = percentageChange >= 0;
  const isNeutralChange = percentageChange === 0;

  const getTrendIcon = () => {
    if (isNeutralChange) return <IconMinus size={16} />;
    return isPositiveChange ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />;
  };

  const getTrendColor = () => {
    if (isNeutralChange) return 'text.secondary';
    return isPositiveChange ? 'success.main' : 'error.main';
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 4
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
              {icon}
            </Avatar>
            {target && (
              <Tooltip title={`Target: ${formatCurrency(target)}`}>
                <IconButton size="small">
                  <IconInfoCircle size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Title */}
          <Box>
            <Typography variant="h6" color={`${color}.main`} gutterBottom>
              {title}
            </Typography>

            {loading ? (
              <LinearProgress sx={{ mb: 1 }} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(amount)}
              </Typography>
            )}

            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>

          {/* Trend and Progress */}
          <Stack spacing={1}>
            {/* Trend */}
            {showTrend && previousAmount !== undefined && !loading && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: getTrendColor()
                  }}
                >
                  {getTrendIcon()}
                </Box>
                <Typography
                  variant="body2"
                  color={getTrendColor()}
                  sx={{ fontWeight: 500 }}
                >
                  {formatPercentage(percentageChange)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  vs last period
                </Typography>
              </Stack>
            )}

            {/* Progress towards target */}
            {target && !loading && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progress to target
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {progress.toFixed(1)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  color={color}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FinancialSummaryCard;