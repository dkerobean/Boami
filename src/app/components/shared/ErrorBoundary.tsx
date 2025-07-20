/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Stack,
  Divider
} from '@mui/material';
import { IconAlertTriangle, IconRefresh, IconBug } from '@tabler/icons-react';
import { ErrorHandler } from '@/lib/utils/error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    const errorDetails = ErrorHandler.handleError(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    this.setState({
      error,
      errorInfo,
      errorId: `error-${Date.now()}`
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToService(error, errorInfo, errorDetails);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            p: 3
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Stack spacing={3} alignItems="center">
                <IconAlertTriangle size={64} color="error" />

                <Box textAlign="center">
                  <Typography variant="h5" color="error" gutterBottom>
                    Something went wrong
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                  </Typography>
                </Box>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Error Details (Development Mode):
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </Typography>
                  </Alert>
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconRefresh size={20} />}
                    onClick={this.handleRetry}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="contained"
                    onClick={this.handleReload}
                  >
                    Reload Page
                  </Button>
                </Stack>

                {this.state.errorId && (
                  <Box textAlign="center">
                    <Divider sx={{ width: '100%', mb: 2 }} />
                    <Typography variant="caption" color="text.secondary">
                      Error ID: {this.state.errorId}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Please include this ID when contacting support
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook to handle errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error | string, context?: any) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    ErrorHandler.handleError(errorObj, {
      component: 'useErrorHandler',
      action: 'handleError',
      additionalData: context
    });

    setError(errorObj);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  return { handleError, clearError };
}

/**
 * Async error boundary for handling promise rejections
 */
export function AsyncErrorBoundary({ children }: { children: ReactNode }) {
  const { handleError } = useErrorHandler();

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError]);

  return <>{children}</>;
}

export default ErrorBoundary;