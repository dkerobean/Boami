# Subscription Payment System - Deployment Guide

This guide covers the complete deployment process for the Subscription Payment System, including production environment setup, SSL configuration, and monitoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [Production Deployment](#production-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Monitoring and Health Checks](#monitoring-and-health-checks)
8. [Backup and Recovery](#backup-and-recovery)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ or CentOS 8+
- **Node.js**: Version 18.x or higher
- **MongoDB**: Version 5.0+ (Atlas or self-hosted)
- **Redis**: Version 6.0+ (optional, for caching)
- **Nginx**: Latest stable version
- **SSL Certificate**: Let's Encrypt or commercial certificate

### Required Tools

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB tools
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-database-tools

# Install PM2 for process management
sudo npm install -g pm2

# Install other dependencies
sudo apt-get install -y nginx certbot python3-certbot-nginx curl git
```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/subscription-payment-system.git
cd subscription-payment-system
```

### 2. Install Dependencies

```bash
npm ci --only=production
```

### 3. Environment Configuration

Copy the production environment template:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your production values:

```bash
# Required Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/production_db
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-your-production-public-key
FLUTTERWAVE_SECRET_KEY=FLWSECK-your-production-secret-key
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret-hash
NEXTAUTH_SECRET=your-super-secure-nextauth-secret
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 4. Build Application

```bash
npm run build
```

## Database Migration

### 1. Run Subscription System Migrations

```bash
npm run db:migrate:subscription
```

### 2. Verify Migration Status

```bash
npm run db:status
npm run db:verify
```

### 3. Test Database Connection

```bash
npm run db:check
```

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended)

```bash
sudo bash scripts/ssl-setup.sh your-domain.com admin@your-domain.com
```

### Option 2: Self-Signed Certificate (Development)

```bash
sudo bash scripts/ssl-setup.sh localhost admin@localhost.com self-signed
```

### Option 3: Commercial Certificate

1. Place your certificate files:
   - Certificate: `/etc/ssl/certs/subscription-system/your-domain.com.crt`
   - Private Key: `/etc/ssl/private/subscription-system/your-domain.com.key`

2. Update environment variables:
   ```bash
   SSL_CERT_PATH=/etc/ssl/certs/subscription-system/your-domain.com.crt
   SSL_KEY_PATH=/etc/ssl/private/subscription-system/your-domain.com.key
   ```

## Production Deployment

### Automated Deployment

```bash
# Full production deployment
npm run deploy:production

# Staging deployment
npm run deploy:staging
```

### Manual Deployment Steps

1. **Pre-deployment Backup**:
   ```bash
   npm run db:backup
   ```

2. **Deploy Application**:
   ```bash
   # Install dependencies
   npm ci --only=production

   # Build application
   npm run build

   # Run migrations
   npm run db:migrate:subscription

   # Start with PM2
   npm run pm2:start
   ```

3. **Configure Nginx**:
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

4. **Verify Deployment**:
   ```bash
   npm run health:check
   curl -f https://your-domain.com/api/health
   ```

## Docker Deployment

### 1. Build Docker Image

```bash
docker build -t subscription-system:latest .
```

### 2. Deploy with Docker Compose

```bash
# Production deployment
docker-compose up -d

# With monitoring
docker-compose --profile monitoring up -d
```

### 3. Environment Configuration

Create `.env.production` file with production values before running Docker Compose.

### 4. Database Migration in Docker

```bash
# Run migrations in container
docker-compose exec app npm run db:migrate:subscription
```

## Monitoring and Health Checks

### 1. System Health Monitoring

The system includes automated health checks:

```bash
# Manual health check
curl https://your-domain.com/api/health

# Automated monitoring (runs every 5 minutes)
npm run monitoring:health
```

### 2. Log Monitoring

```bash
# Application logs
npm run logs:subscription

# Error logs
npm run logs:error

# PM2 logs
npm run pm2:logs
```

### 3. Performance Monitoring

Access monitoring dashboards:
- **Application**: `https://your-domain.com/admin/analytics`
- **System Health**: `https://your-domain.com/admin/system`
- **Grafana** (if enabled): `http://your-domain.com:3001`

## Backup and Recovery

### 1. Automated Backups

Backups are automatically created daily at 2 AM:

```bash
# Manual backup
npm run db:backup

# Backup with custom location
node scripts/backup-database.js --output /custom/path/backup.gz
```

### 2. Backup Verification

```bash
# List backups
ls -la /var/backups/subscription-system/

# Verify backup integrity
node scripts/backup-database.js --verify /path/to/backup.gz
```

### 3. Recovery Process

```bash
# Stop application
npm run pm2:stop

# Restore database
npm run db:restore -- --input /path/to/backup.gz

# Start application
npm run pm2:start

# Verify recovery
npm run health:check
```

## Webhook Configuration

### 1. Flutterwave Webhook Setup

Configure webhook URL in Flutterwave dashboard:
- **URL**: `https://your-domain.com/api/webhooks/flutterwave`
- **Secret Hash**: Use value from `FLUTTERWAVE_WEBHOOK_SECRET`

### 2. Webhook Security

The system automatically:
- Verifies webhook signatures
- Implements IP whitelisting
- Provides idempotent processing
- Includes retry mechanisms

### 3. Test Webhook

```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/flutterwave \
  -H "Content-Type: application/json" \
  -H "verif-hash: your-webhook-secret" \
  -d '{"event": "charge.completed", "data": {...}}'
```

## Performance Optimization

### 1. Caching Configuration

Enable Redis caching:

```bash
# Install Redis
sudo apt-get install redis-server

# Configure in .env.production
REDIS_URL=redis://localhost:6379
```

### 2. Database Optimization

```bash
# Verify database indexes
npm run db:verify

# Monitor database performance
npm run db:stats
```

### 3. Application Optimization

- Enable gzip compression in Nginx
- Configure CDN for static assets
- Implement database connection pooling
- Use PM2 cluster mode

## Security Checklist

- [ ] SSL certificate installed and valid
- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] Webhook endpoints protected
- [ ] Rate limiting configured
- [ ] Security headers implemented
- [ ] Regular security updates applied
- [ ] Backup encryption enabled

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   ```bash
   # Check MongoDB connection
   npm run db:check

   # Verify connection string
   echo $MONGODB_URI
   ```

2. **SSL Certificate Issues**:
   ```bash
   # Check certificate validity
   openssl x509 -in /path/to/cert.crt -noout -dates

   # Test SSL configuration
   curl -I https://your-domain.com
   ```

3. **Payment Webhook Failures**:
   ```bash
   # Check webhook logs
   tail -f /var/log/subscription-system/webhook.log

   # Verify webhook configuration
   curl -f https://your-domain.com/api/webhooks/flutterwave
   ```

4. **Application Not Starting**:
   ```bash
   # Check PM2 status
   npm run pm2:monit

   # View error logs
   npm run logs:error

   # Restart application
   npm run pm2:restart
   ```

### Log Locations

- **Application Logs**: `/var/log/subscription-system/`
- **Nginx Logs**: `/var/log/nginx/`
- **PM2 Logs**: `~/.pm2/logs/`
- **System Logs**: `/var/log/syslog`

### Support Commands

```bash
# System status
npm run pm2:monit

# Health check
npm run health:check

# Database status
npm run db:status

# View recent logs
npm run logs:subscription

# Restart services
npm run pm2:restart
sudo systemctl restart nginx
```

## Rollback Procedure

If deployment fails:

```bash
# Automated rollback
bash scripts/deploy-production.sh rollback

# Manual rollback
npm run pm2:stop
# Restore from backup
npm run db:restore -- --input /path/to/backup.gz
npm run pm2:start
```

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Review system health metrics
   - Check SSL certificate expiry
   - Verify backup integrity

2. **Monthly**:
   - Update dependencies
   - Review security logs
   - Clean old backups

3. **Quarterly**:
   - Security audit
   - Performance optimization
   - Disaster recovery testing

### Update Process

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm ci --only=production

# Run migrations
npm run db:migrate:subscription

# Build and restart
npm run build
npm run pm2:reload
```

## Support

For deployment issues:

1. Check the troubleshooting section above
2. Review application logs
3. Verify environment configuration
4. Test individual components

For additional support, refer to the project documentation or contact the development team.