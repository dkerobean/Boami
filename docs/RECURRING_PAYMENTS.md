# Recurring Payment Automation System

## Overview

The Recurring Payment Automation System provides automated processing of recurring income and expense payments. It includes a comprehensive scheduling system, monitoring capabilities, and error handling to ensure reliable financial transaction processing.

## Features

- **Automated Processing**: Scheduled processing of due recurring payments
- **Flexible Scheduling**: Support for daily, weekly, monthly, and yearly frequencies
- **Real-time Monitoring**: Comprehensive logging and metrics tracking
- **Error Handling**: Robust error handling with retry mechanisms
- **Admin Dashboard**: Web-based monitoring and control interface
- **API Integration**: RESTful APIs for manual processing and monitoring

## Architecture

### Components

1. **RecurringPaymentProcessor**: Core processing logic for recurring payments
2. **CronScheduler**: Scheduled job management and execution
3. **PaymentMonitor**: Logging, metrics, and alerting system
4. **SystemStartup**: Service initialization and configuration
5. **Admin Dashboard**: React-based monitoring interface

### Data Flow

```
Cron Scheduler → RecurringPaymentProcessor → Database Updates → Payment Monitor → Notifications
```

## Configuration

### Environment Variables

```env
# Cron job authentication
CRON_SECRET=your-cron-secret-key-for-scheduled-jobs

# Default schedule (daily at midnight)
RECURRING_PAYMENT_CRON_SCHEDULE=0 0 * * *

# Enable/disable automatic processing
ENABLE_CRON_JOBS=true

# Logging level
LOG_LEVEL=info

# Disable auto-initialization (for testing)
DISABLE_AUTO_INIT=false

# Financial data encryption
FINANCIAL_DATA_ENCRYPTION_KEY=your-financial-data-encryption-key
```

### Cron Schedule Formats

- **Daily**: `0 0 * * *` (midnight every day)
- **Every 6 hours**: `0 */6 * * *`
- **Every hour**: `0 * * * *`
- **Weekly**: `0 0 * * 0` (Sunday at midnight)
- **Monthly**: `0 0 1 * *` (1st of every month at midnight)

## API Endpoints

### Process Recurring Payments

```http
POST /api/finance/recurring/process
Authorization: Bearer <token> | x-cron-secret: <secret>
Content-Type: application/json

{
  "forceProcess": false,
  "specificPaymentId": "optional-payment-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processedCount": 5,
    "createdRecords": [...],
    "deactivatedCount": 1,
    "hasErrors": false,
    "errorCount": 0,
    "errors": []
  },
  "message": "Successfully processed 5 recurring payments"
}
```

### Get Processing Schedule

```http
GET /api/finance/recurring/process?daysAhead=30&includeOverdue=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "upcomingSchedule": [...],
    "overduePayments": [...],
    "summary": {
      "upcoming": 10,
      "overdue": 2,
      "totalIncome": 5000,
      "totalExpenses": 2000
    }
  }
}
```

### Admin Control

```http
POST /api/admin/cron
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "start|stop|force-run|enable-job|update-schedule",
  "jobId": "recurring-payments",
  "schedule": "0 0 * * *",
  "enabled": true
}
```

## Usage

### Automatic Processing

The system automatically processes recurring payments based on the configured schedule:

1. **Scheduler Start**: System starts the cron scheduler on application startup
2. **Job Execution**: Scheduled jobs run at specified intervals
3. **Payment Processing**: Due payments are identified and processed
4. **Record Creation**: Income/expense records are created automatically
5. **Inventory Updates**: Sales-based payments update inventory levels
6. **Notifications**: Users receive notifications about processed payments

### Manual Processing

You can manually trigger payment processing:

```javascript
// Process all due payments for a specific user
const result = await RecurringPaymentProcessor.processUserRecurringPayments(userId);

// Process all due payments system-wide
const result = await RecurringPaymentProcessor.processAllDueRecurringPayments();

// Process a specific recurring payment
const result = await RecurringPaymentProcessor.processSpecificRecurringPayment(paymentId);
```

### Monitoring

Access the admin dashboard at `/admin/recurring-payments` to:

- View scheduler status and statistics
- Monitor payment processing metrics
- Review system logs and errors
- Control scheduler settings
- Force manual processing runs

## Error Handling

### Error Types

1. **Validation Errors**: Invalid payment data or configuration
2. **Database Errors**: Connection issues or query failures
3. **Business Logic Errors**: Insufficient funds, expired payments
4. **System Errors**: Unexpected failures or timeouts

### Error Recovery

- **Automatic Retry**: Failed payments are retried on next scheduled run
- **Error Logging**: All errors are logged with detailed context
- **Alert System**: High error rates trigger notifications
- **Manual Intervention**: Admin dashboard allows manual processing

### Error Monitoring

```javascript
// Get recent errors
const errors = paymentMonitor.getRecentErrors(60); // Last 60 minutes

// Get error metrics
const metrics = paymentMonitor.getMetrics();
console.log(`Error rate: ${metrics.errorRate}%`);

// Configure alerts
paymentMonitor.updateAlertConfig({
  enabled: true,
  errorThreshold: 5,
  timeWindow: 60
});
```

## Testing

### Unit Tests

```bash
npm test src/__tests__/services/recurring-payment-automation.test.ts
```

### Integration Tests

```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/finance/recurring/process \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"forceProcess": true}'

# Test cron endpoint
curl -X POST http://localhost:3000/api/admin/cron \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "force-run", "jobId": "recurring-payments"}'
```

### Manual Testing

1. Create recurring payments with different frequencies
2. Set due dates in the past to trigger processing
3. Monitor logs and verify record creation
4. Test error scenarios (invalid data, database issues)
5. Verify inventory updates for sales-based payments

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**: Process multiple payments in batches
2. **Database Indexing**: Optimize queries with proper indexes
3. **Connection Pooling**: Reuse database connections
4. **Caching**: Cache frequently accessed data
5. **Monitoring**: Track processing times and resource usage

### Scaling

- **Horizontal Scaling**: Run multiple instances with job distribution
- **Database Sharding**: Partition data by user or date ranges
- **Queue Systems**: Use message queues for high-volume processing
- **Load Balancing**: Distribute API requests across instances

## Security

### Authentication

- **JWT Tokens**: User authentication for API access
- **Cron Secrets**: Secure authentication for scheduled jobs
- **Role-Based Access**: Admin-only access to control endpoints

### Data Protection

- **Encryption**: Sensitive financial data encryption
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Complete audit trail of all operations
- **Rate Limiting**: Prevent API abuse and DoS attacks

### Best Practices

1. **Secure Secrets**: Use strong, unique secrets for production
2. **HTTPS Only**: Always use encrypted connections
3. **Regular Updates**: Keep dependencies up to date
4. **Access Control**: Limit admin access to authorized users
5. **Monitoring**: Continuously monitor for security issues

## Troubleshooting

### Common Issues

1. **Payments Not Processing**
   - Check scheduler status
   - Verify cron job configuration
   - Review error logs
   - Confirm database connectivity

2. **High Error Rates**
   - Check database performance
   - Review payment validation rules
   - Verify category/vendor references
   - Monitor system resources

3. **Performance Issues**
   - Optimize database queries
   - Reduce batch sizes
   - Check system resources
   - Review processing logs

### Debugging

```javascript
// Enable debug logging
SystemStartup.updateConfig({ logLevel: 'debug' });

// Check scheduler status
const stats = cronScheduler.getStats();
console.log('Scheduler stats:', stats);

// Review recent logs
const logs = paymentMonitor.getLogs({
  type: 'error',
  limit: 50
});

// Force processing with detailed logging
const result = await RecurringPaymentProcessor.processUserRecurringPayments(userId);
console.log('Processing result:', result);
```

## Maintenance

### Regular Tasks

1. **Log Cleanup**: Regularly clean old logs to prevent storage issues
2. **Metrics Review**: Monitor performance metrics and trends
3. **Error Analysis**: Review and address recurring errors
4. **Configuration Updates**: Adjust schedules based on usage patterns
5. **Security Audits**: Regular security reviews and updates

### Monitoring Checklist

- [ ] Scheduler is running and processing jobs
- [ ] Error rates are within acceptable limits
- [ ] Processing times are reasonable
- [ ] Database performance is optimal
- [ ] Logs are being generated and stored
- [ ] Notifications are working correctly
- [ ] Admin dashboard is accessible

## Support

For issues or questions regarding the Recurring Payment Automation System:

1. Check the system logs for error details
2. Review the admin dashboard for system status
3. Consult this documentation for configuration help
4. Contact the development team for technical support

## Changelog

### Version 1.0.0
- Initial implementation of recurring payment automation
- Basic scheduling and processing capabilities
- Admin dashboard and monitoring system
- Comprehensive error handling and logging
- API endpoints for manual control and monitoring