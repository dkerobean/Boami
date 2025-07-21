'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Typography,
  Box,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
} from '@mui/material';
import { format } from 'date-fns';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconPackage,
  IconAlertTriangle,
  IconShoppingCart,
  IconRefresh,
  IconEye,
} from '@tabler/icons-react';

interface ActivityItem {
  _id: string;
  type: 'product_added' | 'stock_updated' | 'product_sold' | 'alert_triggered' | 'alert_resolved';
  title: string;
  description: string;
  timestamp: Date;
  productId?: string;
  productName?: string;
  metadata?: {
    action?: string;
    quantityChange?: number;
    previousQuantity?: number;
    newQuantity?: number;
    category?: string[];
    price?: number;
    initialStock?: number;
    alertType?: string;
    priority?: string;
    threshold?: number;
    currentStock?: number;
    quantity?: number;
    total?: number;
    customerName?: string;
  };
}

interface RecentActivitiesTableProps {
  activities: ActivityItem[];
  loading: boolean;
  onRefresh: () => void;
}

const RecentActivitiesTable: React.FC<RecentActivitiesTableProps> = ({ 
  activities, 
  loading, 
  onRefresh 
}) => {
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'product_added':
        return <IconPackage size={18} />;
      case 'stock_updated':
        return <IconTrendingUp size={18} />;
      case 'product_sold':
        return <IconShoppingCart size={18} />;
      case 'alert_triggered':
        return <IconAlertTriangle size={18} />;
      case 'alert_resolved':
        return <IconMinus size={18} />;
      default:
        return <IconMinus size={18} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'product_added':
        return 'success' as const;
      case 'stock_updated':
        return 'info' as const;
      case 'product_sold':
        return 'primary' as const;
      case 'alert_triggered':
        return 'warning' as const;
      case 'alert_resolved':
        return 'success' as const;
      default:
        return 'default' as const;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'product_added':
        return 'Product Added';
      case 'stock_updated':
        return 'Stock Updated';
      case 'product_sold':
        return 'Product Sold';
      case 'alert_triggered':
        return 'Alert Triggered';
      case 'alert_resolved':
        return 'Alert Resolved';
      default:
        return 'Unknown';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'error' as const;
      case 'high':
        return 'warning' as const;
      case 'medium':
        return 'info' as const;
      case 'low':
        return 'success' as const;
      default:
        return 'default' as const;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderMetadataDetails = (activity: ActivityItem) => {
    const { type, metadata } = activity;
    
    if (!metadata) return null;

    switch (type) {
      case 'stock_updated':
        return (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {metadata.action && (
              <Chip size="small" label={`Action: ${metadata.action}`} variant="outlined" />
            )}
            {metadata.quantityChange && (
              <Chip 
                size="small" 
                label={`Change: ${metadata.quantityChange > 0 ? '+' : ''}${metadata.quantityChange}`}
                color={metadata.quantityChange > 0 ? 'success' : 'error'}
                variant="outlined"
              />
            )}
            {metadata.newQuantity !== undefined && (
              <Chip size="small" label={`New Stock: ${metadata.newQuantity}`} variant="outlined" />
            )}
          </Stack>
        );
        
      case 'product_added':
        return (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {metadata.price && (
              <Chip size="small" label={formatCurrency(metadata.price)} color="primary" variant="outlined" />
            )}
            {metadata.initialStock !== undefined && (
              <Chip size="small" label={`Initial Stock: ${metadata.initialStock}`} variant="outlined" />
            )}
            {metadata.category && metadata.category.length > 0 && (
              <Chip size="small" label={metadata.category[0]} variant="outlined" />
            )}
          </Stack>
        );
        
      case 'alert_triggered':
        return (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {metadata.priority && (
              <Chip 
                size="small" 
                label={metadata.priority} 
                color={getPriorityColor(metadata.priority)}
                variant="outlined"
              />
            )}
            {metadata.currentStock !== undefined && (
              <Chip size="small" label={`Current: ${metadata.currentStock}`} variant="outlined" />
            )}
            {metadata.threshold && (
              <Chip size="small" label={`Threshold: ${metadata.threshold}`} variant="outlined" />
            )}
          </Stack>
        );
        
      case 'product_sold':
        return (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {metadata.quantity && (
              <Chip size="small" label={`Qty: ${metadata.quantity}`} variant="outlined" />
            )}
            {metadata.total && (
              <Chip size="small" label={formatCurrency(metadata.total)} color="success" variant="outlined" />
            )}
            {metadata.customerName && (
              <Chip size="small" label={metadata.customerName} variant="outlined" />
            )}
          </Stack>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Activity</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton height={40} /></TableCell>
                <TableCell><Skeleton height={30} /></TableCell>
                <TableCell><Skeleton height={40} /></TableCell>
                <TableCell><Skeleton height={60} /></TableCell>
                <TableCell><Skeleton height={40} /></TableCell>
                <TableCell><Skeleton height={30} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" mb={2}>
          No Activities Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          There are no recent activities to display.
        </Typography>
        <IconButton onClick={onRefresh} color="primary">
          <IconRefresh />
        </IconButton>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <Box display="flex" alignItems="center" gap={1}>
                Activity
                <Tooltip title="Refresh Activities">
                  <IconButton size="small" onClick={onRefresh}>
                    <IconRefresh size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Product</TableCell>
            <TableCell>Details</TableCell>
            <TableCell>Date & Time</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activities.map((activity) => {
            const activityColor = getActivityColor(activity.type);
            const activityIcon = getActivityIcon(activity.type);
            
            return (
              <TableRow key={activity._id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                      sx={{
                        bgcolor: `${activityColor}.light`,
                        color: `${activityColor}.main`,
                        width: 40,
                        height: 40,
                      }}
                    >
                      {activityIcon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {activity.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.description}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={getActivityTypeLabel(activity.type)}
                    color={activityColor}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                
                <TableCell>
                  {activity.productName ? (
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {activity.productName}
                      </Typography>
                      {activity.productId && (
                        <Typography variant="caption" color="text.secondary">
                          ID: {activity.productId}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  {renderMetadataDetails(activity)}
                </TableCell>
                
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {format(new Date(activity.timestamp), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(activity.timestamp), 'hh:mm a')}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell align="center">
                  {activity.productId && (
                    <Tooltip title="View Product">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          // Navigate to product details
                          window.open(`/apps/ecommerce/productlist/product-detail/${activity.productId}`, '_blank');
                        }}
                      >
                        <IconEye size={16} />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RecentActivitiesTable;