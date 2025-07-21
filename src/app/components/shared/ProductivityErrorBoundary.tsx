"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Alert, AlertTitle, Button, Typography, Paper } from '@mui/material';
import { IconRefresh, IconBug, IconAlertTriangle } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  feature?: 'notes' | 'calendar' | 'kanban' | 'productivity';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

/**
 * Error boundary component specifically for productivity features
 */
export class ProductivityErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId()
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Productivity Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In a real application, you would send this to your error monitoring service
    // like Sentry, LogRocket, or Bugsnag
    const errorData = {
      errorId: this.state.errorId,
      feature: this.props.feature || 'productivity',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    console.log('Error logged:', errorData);
    // TODO: Send to actual error monitoring service
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: this.generateErrorId()
    });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private getFeatureName(): string {
    switch (this.props.feature) {
      case 'notes':
        return 'Notes';
      case 'calendar':
        return 'Calendar';
      case 'kanban':
        return 'Kanban Board';
      default:
        return 'Productivity';
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const featureName = this.getFeatureName();
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <Box p={3}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconAlertTriangle size="1.2rem" />
                {featureName} Error
              </AlertTitle>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Something went wrong while loading the {featureName.toLowerCase()} feature.
                This error has been logged and will be investigated.
              </Typography>

              {isDevelopment && this.state.error && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Error ID: {this.state.errorId}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {this.state.error.message}
                  </Typography>
                  {this.state.error.stack && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
                        Stack Trace
                      </summary>
                      <pre style={{
                        fontSize: '0.7rem',
                        overflow: 'auto',
                        maxHeight: '200px',
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: '#f5f5f5',
                        borderRadius: 4
                      }}>
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </Box>
              )}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<IconRefresh size="1rem" />}
                onClick={this.handleRetry}
                size="small"
              >
                Try Again
              </Button>

              <Button
                variant="outlined"
                onClick={this.handleReload}
                size="small"
              >
                Reload Page
              </Button>

              {isDevelopment && (
                <Button
                  variant="text"
                  startIcon={<IconBug size="1rem" />}
                  onClick={() => console.log('Error details:', this.state)}
                  size="small"
                >
                  Debug Info
                </Button>
              )}
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="info.dark">
                <strong>What you can do:</strong>
              </Typography>
              <Typography variant="body2" color="info.dark" component="ul" sx={{ mt: 1, pl: 2 }}>
                <li>Try refreshing the page</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache</li>
                <li>Contact support if the problem persists</li>
              </Typography>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to use error boundary programmatically
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Handled error:', error);
    setError(error);
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
 * Higher-order component to wrap components with error boundary
 */
export function withProductivityErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  feature?: 'notes' | 'calendar' | 'kanban' | 'productivity'
) {
  const WrappedComponent = (props: P) => (
    <ProductivityErrorBoundary feature={feature}>
      <Component {...props} />
    </ProductivityErrorBoundary>
  );

  WrappedComponent.displayName = `withProductivityErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ProductivityErrorBoundary;