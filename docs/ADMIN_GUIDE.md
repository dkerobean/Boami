# Admin Guide - Subscription Payment System

This guide provides comprehensive information for administrators managing the Subscription Payment System, including user management, analytics, system monitoring, and troubleshooting.

## Table of Contents

1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [User Management](#user-management)
3. [Subscription Management](#subscription-management)
4. [Plan Management](#plan-management)
5. [Analytics and Reporting](#analytics-and-reporting)
6. [System Monitoring](#system-monitoring)
7. [Data Management](#data-management)
8. [Security and Compliance](#security-and-compliance)
9. [Troubleshooting](#troubleshooting)
10. [System Maintenance](#system-maintenance)

## Admin Dashboard Overview

### Accessing the Admin Dashboard

1. **Login Requirements**
   - Admin role required
   - Two-factor authentication recommended
   - Access URL: `https://your-domain.com/admin`

2. **Dashboard Sections**
   - **Overview**: Key metrics and system health
   - **Subscriptions**: Manage all user subscriptions
   - **Plans**: Configure subscription plans
   - **Users**: User account management
   - **Analytics**: Revenue and usage analytics
   - **System**: Health monitoring and logs
   - **Data**: Migration and backup tools
   - **Settings**: System configuration

### Key Metrics

The dashboard displays critical business metrics:

- **Active Subscriptions**: Currently active paying customers
- **Monthly Recurring Revenue (MRR)**: Predictable monthly income
- **Churn Rate**: Percentage of customers canceling
- **Conversion Rate**: Trial to paid conversion percentage
- **Average Revenue Per User (ARPU)**: Revenue per customer
- **Customer Lifetime Value (CLV)**: Predicted customer value

## User Management

### User Overview

Access user management at `/admin/users`:

- **User List**: Paginated list of all users
- **Search and Filter**: Find users by email, name, or status
- **User Details**: Comprehensive user information
- **Account Actions**: Suspend, activate, or delete accounts

### User Information

Each user profile includes:

#### Basic Information
- **Name**: First and last name
- **Email**: Primary contact email
- **Phone**: Contact phone number
- **Registration Date**: Account creation date
- **Last Login**: Most recent login timestamp
- **Status**: Active, suspended, or deleted

#### Subscription Information
- **Current Plan**: Active subscription plan
- **Subscription Status**: Active, cancelled, expired, etc.
- **Billing Period**: Monthly or annual
- **Next Billing Date**: Upcoming payment date
- **Payment Method**: Credit card, PayPal, etc.

#### Usage Statistics
- **Login Frequency**: How often user logs in
- **Feature Usage**: Which features are being used
- **API Calls**: Number of API requests made
- **Storage Used**: Amount of storage consumed

### User Actions

#### Account Management
1. **Suspend Account**
   - Temporarily disable user access
   - Preserve data and subscription
   - User can be reactivated later

2. **Activate Account**
   - Restore access to suspended account
   - Resume normal functionality
   - Send reactivation notification

3. **Delete Account**
   - Permanently remove user account
   - Cancel active subscriptions
   - Data retention per privacy policy

#### Subscription Management
1. **View Subscription Details**
   - Current plan and billing information
   - Payment history and invoices
   - Usage statistics and limits

2. **Modify Subscription**
   - Change plan or billing period
   - Apply discounts or credits
   - Extend or modify trial periods

3. **Cancel Subscription**
   - Immediate or end-of-period cancellation
   - Refund processing if applicable
   - Downgrade to free plan option

#### Communication
1. **Send Email**
   - Direct email to user
   - Template-based messages
   - Track email delivery status

2. **Add Notes**
   - Internal notes about user
   - Support interaction history
   - Account-specific information

### Bulk Operations

#### User Import
1. **CSV Import**
   - Upload user data via CSV file
   - Map columns to user fields
   - Validate data before import
   - Send welcome emails to new users

2. **Required Fields**
   - Email address (unique)
   - First and last name
   - Initial subscription plan (optional)

#### Bulk Actions
1. **Email Campaigns**
   - Send emails to user segments
   - Filter by plan, status, or usage
   - Track campaign performance

2. **Plan Migrations**
   - Move users between plans
   - Apply bulk discounts
   - Update billing periods

## Subscription Management

### Subscription Overview

Access subscription management at `/admin/subscriptions`:

- **All Subscriptions**: Complete list with filters
- **Status Filters**: Active, cancelled, expired, past due
- **Search Options**: By user, plan, or subscription ID
- **Bulk Actions**: Mass updates and exports

### Subscription Details

Each subscription includes:

#### Basic Information
- **Subscription ID**: Unique identifier
- **User**: Associated customer account
- **Plan**: Current subscription plan
- **Status**: Current subscription state
- **Created Date**: Subscription start date

#### Billing Information
- **Billing Period**: Monthly or annual
- **Current Period**: Start and end dates
- **Next Billing Date**: Upcoming payment
- **Amount**: Subscription cost
- **Currency**: Billing currency

#### Payment History
- **Recent Payments**: Last 10 transactions
- **Payment Method**: Card or other method
- **Payment Status**: Success, failed, pending
- **Invoices**: Generated billing documents

### Subscription Actions

#### Status Management
1. **Activate Subscription**
   - Manually activate pending subscription
   - Useful for offline payments
   - Triggers activation emails

2. **Suspend Subscription**
   - Temporarily pause subscription
   - Maintain billing relationship
   - User loses access to paid features

3. **Cancel Subscription**
   - End subscription immediately or at period end
   - Process refunds if applicable
   - Send cancellation confirmation

#### Plan Changes
1. **Upgrade Subscription**
   - Move to higher-tier plan
   - Calculate prorated charges
   - Immediate feature access

2. **Downgrade Subscription**
   - Move to lower-tier plan
   - Schedule change for period end
   - Feature access restrictions

3. **Change Billing Period**
   - Switch between monthly/annual
   - Adjust pricing accordingly
   - Update next billing date

#### Payment Management
1. **Process Manual Payment**
   - Record offline payments
   - Update subscription status
   - Generate receipt/invoice

2. **Issue Refund**
   - Full or partial refunds
   - Update payment records
   - Send refund confirmation

3. **Update Payment Method**
   - Change credit card or payment source
   - Verify new payment method
   - Update billing information

### Subscription Analytics

#### Individual Subscription Metrics
- **Lifetime Value**: Total revenue from subscription
- **Duration**: How long subscription has been active
- **Upgrade History**: Plan change timeline
- **Payment Success Rate**: Successful vs failed payments

#### Cohort Analysis
- **Retention Rates**: How long users stay subscribed
- **Churn Patterns**: When users typically cancel
- **Revenue Trends**: Revenue changes over time

## Plan Management

### Plan Configuration

Access plan management at `/admin/plans`:

- **Active Plans**: Currently available plans
- **Draft Plans**: Plans being developed
- **Archived Plans**: Discontinued plans
- **Plan Analytics**: Performance metrics

### Plan Details

Each plan includes:

#### Basic Information
- **Plan Name**: Display name for customers
- **Description**: Plan benefits and features
- **Status**: Active, draft, or archived
- **Created Date**: When plan was created

#### Pricing Structure
- **Monthly Price**: Monthly subscription cost
- **Annual Price**: Annual subscription cost (with discount)
- **Currency**: Billing currency
- **Trial Period**: Free trial duration (days)

#### Features and Limits
- **Feature List**: Included features
- **Usage Limits**: API calls, storage, users, etc.
- **Access Controls**: Premium feature access
- **Support Level**: Type of customer support

### Plan Management Actions

#### Create New Plan
1. **Basic Setup**
   - Enter plan name and description
   - Set pricing for monthly/annual billing
   - Define trial period length

2. **Feature Configuration**
   - Select included features
   - Set usage limits and quotas
   - Configure access permissions

3. **Activation**
   - Review plan details
   - Activate for customer selection
   - Announce new plan availability

#### Modify Existing Plan
1. **Price Changes**
   - Update monthly/annual pricing
   - Grandfather existing customers (optional)
   - Communicate changes to users

2. **Feature Updates**
   - Add or remove features
   - Adjust usage limits
   - Update plan descriptions

3. **Status Changes**
   - Archive discontinued plans
   - Reactivate archived plans
   - Create draft versions for testing

#### Plan Analytics
- **Subscription Count**: Users on each plan
- **Revenue Contribution**: Revenue by plan
- **Conversion Rates**: Trial to paid conversion
- **Churn Rates**: Cancellation rates by plan

## Analytics and Reporting

### Revenue Analytics

Access analytics at `/admin/analytics`:

#### Key Revenue Metrics
- **Monthly Recurring Revenue (MRR)**
  - Current MRR and growth rate
  - MRR by plan and customer segment
  - New, expansion, and churned MRR

- **Annual Recurring Revenue (ARR)**
  - Projected annual revenue
  - ARR growth trends
  - Seasonal patterns

- **Revenue Per Customer**
  - Average revenue per user (ARPU)
  - Customer lifetime value (CLV)
  - Revenue distribution by customer

#### Revenue Trends
- **Growth Charts**: Revenue over time
- **Cohort Analysis**: Revenue by customer cohort
- **Plan Performance**: Revenue by subscription plan
- **Geographic Analysis**: Revenue by region

### Subscription Analytics

#### Subscription Metrics
- **Total Subscriptions**: All-time subscription count
- **Active Subscriptions**: Currently paying customers
- **New Subscriptions**: Recent sign-ups
- **Cancelled Subscriptions**: Recent cancellations

#### Churn Analysis
- **Churn Rate**: Percentage of customers leaving
- **Churn Reasons**: Why customers cancel
- **Churn by Plan**: Cancellation rates by plan
- **Retention Curves**: Customer retention over time

#### Conversion Metrics
- **Trial Conversion**: Trial to paid conversion rate
- **Upgrade Rates**: Free to paid upgrades
- **Plan Upgrades**: Movement between plans
- **Seasonal Trends**: Conversion patterns over time

### Payment Analytics

#### Payment Success Metrics
- **Success Rate**: Percentage of successful payments
- **Failure Reasons**: Why payments fail
- **Retry Success**: Success rate of payment retries
- **Payment Methods**: Performance by payment type

#### Transaction Analysis
- **Transaction Volume**: Number of transactions
- **Average Transaction**: Average payment amount
- **Failed Payments**: Failed transaction analysis
- **Refund Rates**: Percentage of refunded payments

### Custom Reports

#### Report Builder
1. **Select Metrics**
   - Choose data points to include
   - Set date ranges and filters
   - Group by various dimensions

2. **Visualization Options**
   - Charts and graphs
   - Tables and lists
   - Export formats (PDF, CSV, Excel)

3. **Scheduled Reports**
   - Automated report generation
   - Email delivery to stakeholders
   - Custom report frequencies

#### Common Reports
- **Monthly Business Review**: Key metrics summary
- **Churn Analysis Report**: Detailed churn insights
- **Revenue Forecast**: Projected revenue trends
- **Plan Performance**: Subscription plan analysis

## System Monitoring

### System Health Dashboard

Access system monitoring at `/admin/system`:

#### Health Status Indicators
- **Overall Status**: Healthy, warning, or critical
- **Database Connectivity**: MongoDB connection status
- **Payment Processing**: Flutterwave integration status
- **Email Services**: Email delivery status
- **API Performance**: Response times and error rates

#### Performance Metrics
- **Response Times**: API endpoint performance
- **Error Rates**: System error frequency
- **Uptime**: System availability percentage
- **Resource Usage**: CPU, memory, and disk usage

### Alert Management

#### Alert Types
1. **System Alerts**
   - Database connection failures
   - High error rates
   - Performance degradation
   - Service outages

2. **Business Alerts**
   - High churn rates
   - Payment processing issues
   - Unusual subscription patterns
   - Revenue anomalies

#### Alert Configuration
1. **Threshold Settings**
   - Set alert thresholds for key metrics
   - Configure alert severity levels
   - Define escalation procedures

2. **Notification Channels**
   - Email notifications
   - Slack integration
   - SMS alerts for critical issues
   - Webhook notifications

### Log Management

#### Log Types
- **Application Logs**: System events and errors
- **Payment Logs**: Transaction processing logs
- **Webhook Logs**: Webhook delivery attempts
- **Security Logs**: Authentication and access logs

#### Log Analysis
1. **Search and Filter**
   - Search logs by keyword or pattern
   - Filter by date range and severity
   - Export log data for analysis

2. **Common Log Queries**
   - Failed payment attempts
   - Webhook delivery failures
   - Authentication errors
   - Performance bottlenecks

## Data Management

### Data Migration Tools

Access data management at `/admin/data`:

#### Available Operations
1. **User Migration**
   - Migrate existing users to subscription system
   - Add default subscription status
   - Bulk update user records

2. **Legacy Data Migration**
   - Update old subscription records
   - Standardize data formats
   - Fix data inconsistencies

3. **Data Cleanup**
   - Remove expired subscriptions
   - Archive old transaction records
   - Clean up test data

#### Migration Process
1. **Pre-Migration Backup**
   - Automatic backup creation
   - Verify backup integrity
   - Store backup securely

2. **Migration Execution**
   - Run migration scripts
   - Monitor progress and errors
   - Validate migrated data

3. **Post-Migration Verification**
   - Verify data integrity
   - Test system functionality
   - Update documentation

### Backup and Recovery

#### Automated Backups
- **Daily Backups**: Automatic daily database backups
- **Retention Policy**: Keep backups for 30 days
- **Encryption**: All backups encrypted at rest
- **Verification**: Regular backup integrity checks

#### Manual Backup Operations
1. **Create Backup**
   - On-demand backup creation
   - Custom backup naming
   - Include/exclude specific data

2. **Restore from Backup**
   - Select backup to restore
   - Confirm restoration process
   - Verify restored data

#### Data Export
1. **Subscription Data Export**
   - Export in JSON or CSV format
   - Filter by date range or status
   - Include related user and payment data

2. **Analytics Data Export**
   - Export metrics and reports
   - Custom date ranges
   - Multiple format options

## Security and Compliance

### Security Monitoring

#### Security Metrics
- **Failed Login Attempts**: Brute force detection
- **Suspicious Activity**: Unusual access patterns
- **API Abuse**: Rate limiting violations
- **Data Access**: Sensitive data access logs

#### Security Alerts
- **Account Lockouts**: Multiple failed login attempts
- **Privilege Escalation**: Unauthorized access attempts
- **Data Breaches**: Potential security incidents
- **System Vulnerabilities**: Security scan results

### Compliance Management

#### Data Privacy Compliance
1. **GDPR Compliance**
   - Data processing records
   - User consent management
   - Right to be forgotten requests
   - Data portability requests

2. **CCPA Compliance**
   - California consumer rights
   - Data disclosure requirements
   - Opt-out mechanisms
   - Consumer request handling

#### Financial Compliance
1. **PCI DSS Compliance**
   - Payment card data security
   - Regular security assessments
   - Vulnerability management
   - Access control measures

2. **SOX Compliance**
   - Financial reporting controls
   - Audit trail maintenance
   - Change management processes
   - Documentation requirements

### Audit Management

#### Audit Logs
- **User Actions**: All user activities logged
- **Admin Actions**: Administrative changes tracked
- **System Changes**: Configuration modifications
- **Data Access**: Sensitive data access logged

#### Audit Reports
1. **Access Reports**
   - User access patterns
   - Administrative access logs
   - Failed access attempts
   - Privilege usage reports

2. **Change Reports**
   - System configuration changes
   - User account modifications
   - Subscription changes
   - Payment processing changes

## Troubleshooting

### Common Issues

#### Payment Processing Issues

**Issue**: High payment failure rate
**Diagnosis Steps**:
1. Check Flutterwave service status
2. Review payment error logs
3. Analyze failure reasons
4. Check payment method validity

**Solutions**:
- Update payment gateway configuration
- Contact payment processor support
- Implement retry mechanisms
- Notify affected customers

**Issue**: Webhook delivery failures
**Diagnosis Steps**:
1. Check webhook endpoint availability
2. Verify webhook signature validation
3. Review webhook delivery logs
4. Test webhook endpoint manually

**Solutions**:
- Fix webhook endpoint issues
- Update webhook configuration
- Implement proper error handling
- Monitor webhook health

#### Subscription Management Issues

**Issue**: Subscription status inconsistencies
**Diagnosis Steps**:
1. Check subscription update logs
2. Review payment processing logs
3. Verify webhook processing
4. Compare with payment gateway records

**Solutions**:
- Run data consistency checks
- Update subscription status manually
- Implement better error handling
- Improve webhook reliability

**Issue**: User access problems
**Diagnosis Steps**:
1. Check user subscription status
2. Verify plan permissions
3. Review authentication logs
4. Test feature access controls

**Solutions**:
- Update user subscription status
- Refresh user permissions
- Clear authentication cache
- Fix feature access logic

### Diagnostic Tools

#### System Health Checks
1. **Database Connectivity**
   ```bash
   npm run db:check
   ```

2. **Payment Gateway Status**
   ```bash
   curl -f https://api.flutterwave.com/v3/status
   ```

3. **Webhook Endpoint Test**
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/flutterwave \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

#### Log Analysis Commands
1. **View Recent Errors**
   ```bash
   npm run logs:error
   ```

2. **Search Payment Logs**
   ```bash
   grep "payment_failed" /var/log/subscription-system/combined.log
   ```

3. **Monitor Real-time Logs**
   ```bash
   npm run logs:subscription
   ```

### Performance Optimization

#### Database Optimization
1. **Index Analysis**
   - Review slow query logs
   - Analyze index usage
   - Add missing indexes
   - Remove unused indexes

2. **Query Optimization**
   - Optimize expensive queries
   - Implement query caching
   - Use database connection pooling
   - Monitor query performance

#### Application Performance
1. **Response Time Optimization**
   - Implement caching strategies
   - Optimize API endpoints
   - Use CDN for static assets
   - Minimize database queries

2. **Resource Usage**
   - Monitor memory usage
   - Optimize CPU-intensive operations
   - Implement rate limiting
   - Scale horizontally if needed

## System Maintenance

### Regular Maintenance Tasks

#### Daily Tasks
- [ ] Review system health dashboard
- [ ] Check payment processing status
- [ ] Monitor error logs for issues
- [ ] Verify backup completion
- [ ] Review security alerts

#### Weekly Tasks
- [ ] Analyze subscription metrics
- [ ] Review churn and conversion rates
- [ ] Check webhook delivery status
- [ ] Update system documentation
- [ ] Review user feedback and support tickets

#### Monthly Tasks
- [ ] Generate business reports
- [ ] Review and update subscription plans
- [ ] Analyze payment failure trends
- [ ] Conduct security review
- [ ] Update system dependencies

#### Quarterly Tasks
- [ ] Comprehensive system audit
- [ ] Performance optimization review
- [ ] Disaster recovery testing
- [ ] Compliance assessment
- [ ] Strategic planning review

### Update Procedures

#### System Updates
1. **Preparation**
   - Review update notes
   - Create system backup
   - Schedule maintenance window
   - Notify stakeholders

2. **Update Process**
   - Deploy to staging environment
   - Run automated tests
   - Deploy to production
   - Verify system functionality

3. **Post-Update**
   - Monitor system performance
   - Check for errors or issues
   - Update documentation
   - Communicate completion

#### Security Updates
1. **Critical Security Patches**
   - Apply immediately
   - Monitor for issues
   - Document changes
   - Notify security team

2. **Regular Security Updates**
   - Schedule during maintenance window
   - Test in staging environment
   - Apply to production
   - Verify security improvements

### Disaster Recovery

#### Backup Strategy
- **Automated Backups**: Daily database backups
- **Offsite Storage**: Backups stored in multiple locations
- **Encryption**: All backups encrypted
- **Testing**: Regular backup restoration tests

#### Recovery Procedures
1. **Identify Issue**
   - Assess scope of problem
   - Determine recovery requirements
   - Notify stakeholders

2. **Recovery Process**
   - Restore from latest backup
   - Verify data integrity
   - Test system functionality
   - Resume normal operations

3. **Post-Recovery**
   - Document incident
   - Analyze root cause
   - Implement preventive measures
   - Update recovery procedures

## Support and Resources

### Internal Resources
- **System Documentation**: Complete technical documentation
- **Runbooks**: Step-by-step operational procedures
- **Knowledge Base**: Common issues and solutions
- **Training Materials**: Admin training resources

### External Support
- **Technical Support**: 24/7 technical support team
- **Payment Gateway Support**: Flutterwave support team
- **Infrastructure Support**: Cloud provider support
- **Security Support**: Security incident response team

### Contact Information
- **System Administrator**: admin@your-domain.com
- **Technical Support**: support@your-domain.com
- **Security Team**: security@your-domain.com
- **Emergency Contact**: +1-555-EMERGENCY

## Appendix

### Useful Commands
```bash
# System health check
npm run health:check

# Database migration
npm run db:migrate:subscription

# Create backup
npm run data:backup

# View logs
npm run logs:subscription

# System monitoring
npm run monitoring:health
```

### Configuration Files
- **Environment**: `.env.production`
- **Database**: `src/lib/database/mongoose-connection.ts`
- **Payment Gateway**: `src/lib/config/flutterwave.ts`
- **Email Service**: `src/lib/email/resend-client.ts`

### API Endpoints
- **Admin API**: `/api/admin/*`
- **Health Check**: `/api/health`
- **Webhooks**: `/api/webhooks/*`
- **Analytics**: `/api/admin/analytics/*`