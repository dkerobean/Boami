import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Typography,
  Stack
} from '@mui/material';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconRefresh,
  IconExternalLink,
  IconChevronDown,
  IconChevronUp,
  IconCopy
} from '@tabler/icons-react';
import { UserFriendlyError, ErrorRecoveryAction } from '../../lib/utils/error-recovery';

interface ErrorDisplayProps {
  error: UserFriendlyError;
  onAction?: (action: ErrorRecoveryAction) => void;
  showTechnicalDetails?: boolean;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onAction,
  showTechnicalDetails = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copiedReference, setCopiedReference] = React.useState(false);

  const getSeverityIcon = () => {
    switch (error.severity) {
      case 'error':
        return <IconAlertCircle size={24} />;
      case 'warning':
        return <IconAlertTriangle size={24} />;
      case 'info':
        return <IconInfoCircle size={24} />;
      default:
        return <IconAlertCircle size={24} />;
    }
  };

  const getSeverityColor = () => {
    switch (error.severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'error';
    }
  };

  const handleAction = (action: ErrorRecoveryAction) => {
    if (onAction) {
      onAction(action);
    } else {
      // Default action handling
      switch (action.type) {
        case 'retry':
          window.location.reload();
          break;
        case 'redirect':
          if (action.url) {
            window.location.href = action.url;
          }
          break;
        case 'refresh':
          window.location.reload();
          break;
        case 'login':
          if (action.url) {
            window.location.href = action.url;
          }
          break;
        case 'upgrade':
          if (action.url) {
            window.location.href = action.url;
          }
          break;
        case 'contact_support':
          if (action.url) {
            window.open(action.url, '_blank');
          }
          break;
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReference(true);
      setTimeout(() => setCopiedReference(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'retry':
      case 'refresh':
        return <IconRefresh size={16} />;
      case 'redirect':
      case 'upgrade':
      case 'login':
      case 'contact_support':
        return <IconExternalLink size={16} />;
      default:
        return null;
    }
  };

  return (
    <Card className={className} sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardContent>
        <Alert severity={getSeverityColor()} sx={{ mb: 2 }}>
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getSeverityIcon()}
            {error.title}
          </AlertTitle>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {error.message}
          </Typography>
        </Alert>

        {/* Recovery Actions */}
        {error.recoveryActions.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              What you can do:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {error.recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.primary ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={getActionIcon(action.type)}
                  onClick={() => handleAction(action)}
                  sx={{ mb: 1 }}
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* Support Reference */}
        {error.supportReference && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Support Reference:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={error.supportReference}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
              <IconButton
                size="small"
                onClick={() => copyToClipboard(error.supportReference!)}
                title="Copy reference"
              >
                <IconCopy size={16} />
              </IconButton>
              {copiedReference && (
                <Typography variant="caption" color="success.main">
                  Copied!
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Please include this reference when contacting support
            </Typography>
          </Box>
        )}

        {/* Technical Details */}
        {(showTechnicalDetails || error.technicalDetails || error.errorCode) && (
          <Box>
            <Button
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              endIcon={showDetails ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              sx={{ mb: 1 }}
            >
              Technical Details
            </Button>
            <Collapse in={showDetails}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                {error.errorCode && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Error Code:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {error.errorCode}
                    </Typography>
                  </Box>
                )}
                {error.technicalDetails && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Details:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {error.technicalDetails}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Timestamp:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {new Date().toISOString()}
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;