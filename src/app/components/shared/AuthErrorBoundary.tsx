"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  CardActions,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  showDetails: boolean;
}

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  showRetry?: boolean;
  showDetails?: boolean;
}

interface ErrorRecoveryStrategy {
  type: 'retry' | 'refresh' | 'logout' | 'ignore';
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => void;
}

/**
 * Authentication Error Boundary Component
 * Handles authentication-related errors with recovery strategies
 */
export class AuthErrorBoundary extends Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: AuthErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error for monitoring
    this.logError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // Log authentication errors for monitoring
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('Authentication Error:', errorData);

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // errorMonitoringService.captureException(error, errorData);
    }
  };

  private getErrorRecoveryStrategy = (error: Error): ErrorRecoveryStrategy => {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('token') && errorMessage.includes('expired')) {
      return { type: 'refresh', maxRetries: 1 };
    }

    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return { type: 'logout' };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return { type: 'retry', maxRetries: 3, retryDelay: 1000 };
    }

    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return { type: 'refresh', maxRetries: 2 };
    }

    return { type: 'retry', maxRetries: 1 };
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount, error } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Max retry attempts reached');
      return;
    }

    const strategy = this.getErrorRecoveryStrategy(error!);

    this.setState({
      retryCount: retryCount + 1,
    });

    // Apply retry delay if specified
    const delay = strategy.retryDelay || 0;

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
      });
    }, delay);
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboards/modern';
  };

  private handleLogout = () => {
    // Clear authentication state and redirect to login
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/auth/auth1/login';
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  private getErrorSeverity = (error: Error): 'error' | 'warning' | 'info' => {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return 'error';
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return 'warning';
    }

    return 'info';
  };

  private getErrorTitle = (error: Error): string => {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('token')) {
      return 'Authentication Error';
    }

    if (errorMessage.includes('network')) {
      return 'Connection Error';
    }

    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return 'Loading Error';
    }

    return 'Application Error';
  };

  private getUserFriendlyMessage = (error: Error): string => {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('token') && errorMessage.includes('expired')) {
      return 'Your session has expired. Please log in again.';
    }

    if (errorMessage.includes('unauthorized')) {
      return 'You are not authorized to access this resource.';
    }

    if (errorMessage.includes('network')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return 'Failed to load application resources. Please refresh the page.';
    }

    return 'An unexpected error occurred. Please try again.';
  };

  render() {
    const { hasError, error, errorInfo, retryCount, showDetails } = this.state;
    const { children, fallback, maxRetries = 3, showRetry = true, showDetails: showDetailsOption = true } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const strategy = this.getErrorRecoveryStrategy(error);
      const severity = this.getErrorSeverity(error);
      const title = this.getErrorTitle(error);
      const userMessage = this.getUserFriendlyMessage(error);
      const canRetry = showRetry && retryCount < maxRetries && strategy.type === 'retry';

      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          p={3}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <SecurityIcon color="error" fontSize="large" />
                <Typography variant="h5" component="h1">
                  {title}
                </Typography>
              </Box>

              <Alert severity={severity} sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {userMessage}
                </Typography>
                {retryCount > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Retry attempt: {retryCount} of {maxRetries}
                  </Typography>
                )}
              </Alert>

              {showDetailsOption && (
                <>
                  <Button
                    startIcon={<ExpandMoreIcon />}
                    onClick={this.toggleDetails}
                    size="small"
                    sx={{ mb: 1 }}
                  >
                    {showDetails ? 'Hide' : 'Show'} Technical Details
                  </Button>

                  <Collapse in={showDetails}>
                    <Box
                      sx={{
                        backgroundColor: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <Typography variant="body2" component="pre">
                        {error.message}
                        {error.stack && `\n\nStack Trace:\n${error.stack}`}
                        {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
                      </Typography>
                    </Box>
                  </Collapse>
                </>
              )}
            </CardContent>

            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
              <Box display="flex" gap={1}>
                {canRetry && (
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={this.handleRetry}
                    color="primary"
                  >
                    Retry
                  </Button>
                )}

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRefresh}
                >
                  Refresh Page
                </Button>
              </Box>

              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>

                {strategy.type === 'logout' && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={this.handleLogout}
                  >
                    Logout
                  </Button>
                )}
              </Box>
            </CardActions>
          </Card>
        </Box>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap components with authentication error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  );

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default AuthErrorBoundary;