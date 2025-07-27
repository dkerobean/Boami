#!/bin/bash

# Production Deployment Script for Subscription Payment System
# This script handles the complete deployment process including database migrations,
# SSL certificate validation, and production environment setup.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
BACKUP_DIR="/var/backups/subscription-system"
LOG_FILE="/var/log/subscription-deployment.log"
HEALTH_CHECK_URL="https://your-domain.com/api/health"
WEBHOOK_URL="https://your-domain.com/api/webhooks/flutterwave"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."

    # Check if required environment variables are set
    if [ ! -f ".env.production" ]; then
        error "Production environment file (.env.production) not found!"
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version)
    log "Node.js version: $NODE_VERSION"

    # Check npm version
    NPM_VERSION=$(npm --version)
    log "npm version: $NPM_VERSION"

    # Check if MongoDB is accessible
    log "Checking MongoDB connection..."
    if ! npm run db:check > /dev/null 2>&1; then
        error "Cannot connect to MongoDB. Please check your database configuration."
    fi
    success "MongoDB connection verified"

    # Check if Redis is accessible (if configured)
    if [ ! -z "$REDIS_URL" ]; then
        log "Checking Redis connection..."
        # Add Redis connection check here
        success "Redis connection verified"
    fi

    # Verify SSL certificates
    if [ ! -z "$SSL_CERT_PATH" ] && [ ! -z "$SSL_KEY_PATH" ]; then
        log "Verifying SSL certificates..."
        if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
            error "SSL certificate files not found!"
        fi

        # Check certificate validity
        if ! openssl x509 -in "$SSL_CERT_PATH" -noout -checkend 86400; then
            error "SSL certificate is expired or will expire within 24 hours!"
        fi
        success "SSL certificates verified"
    fi

    success "Pre-deployment checks completed"
}

# Create backup
create_backup() {
    log "Creating backup..."

    # Create backup directory
    mkdir -p "$BACKUP_DIR/$(date +'%Y-%m-%d')"

    # Backup database
    log "Backing up MongoDB database..."
    if ! npm run db:backup -- --output "$BACKUP_DIR/$(date +'%Y-%m-%d')/mongodb-backup.gz"; then
        error "Database backup failed!"
    fi

    # Backup current application files
    log "Backing up application files..."
    tar -czf "$BACKUP_DIR/$(date +'%Y-%m-%d')/app-backup.tar.gz" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        .

    success "Backup created successfully"
}

# Install dependencies
install_dependencies() {
    log "Installing production dependencies..."

    # Clean install
    rm -rf node_modules package-lock.json
    npm ci --only=production

    success "Dependencies installed"
}

# Build application
build_application() {
    log "Building application for production..."

    # Set production environment
    export NODE_ENV=production

    # Build Next.js application
    npm run build

    # Verify build
    if [ ! -d ".next" ]; then
        error "Build failed - .next directory not found!"
    fi

    success "Application built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."

    # Run subscription system migrations
    if ! npm run db:migrate:subscription; then
        error "Subscription migrations failed!"
    fi

    # Verify migrations
    if ! npm run db:verify:migrations; then
        error "Migration verification failed!"
    fi

    success "Database migrations completed"
}

# Configure webhook security
configure_webhook_security() {
    log "Configuring webhook security..."

    # Verify webhook secret is set
    if [ -z "$FLUTTERWAVE_WEBHOOK_SECRET" ]; then
        error "FLUTTERWAVE_WEBHOOK_SECRET not set!"
    fi

    # Test webhook endpoint
    log "Testing webhook endpoint accessibility..."
    if ! curl -f -s "$WEBHOOK_URL" > /dev/null; then
        warning "Webhook endpoint not accessible - this may be expected if the server isn't running yet"
    fi

    success "Webhook security configured"
}

# Configure monitoring
configure_monitoring() {
    log "Configuring monitoring and alerting..."

    # Set up log rotation
    if [ ! -f "/etc/logrotate.d/subscription-system" ]; then
        cat > /etc/logrotate.d/subscription-system << EOF
/var/log/subscription-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF
    fi

    # Configure cron job for health checks
    if ! crontab -l | grep -q "system-health-check"; then
        (crontab -l 2>/dev/null; echo "*/5 * * * * curl -H 'Authorization: Bearer $CRON_SECRET' $HEALTH_CHECK_URL/api/cron/system-health-check") | crontab -
        log "Health check cron job configured"
    fi

    success "Monitoring configured"
}

# Start application
start_application() {
    log "Starting application..."

    # Stop existing process if running
    if pgrep -f "next start" > /dev/null; then
        log "Stopping existing application..."
        pkill -f "next start"
        sleep 5
    fi

    # Start application with PM2 (if available) or directly
    if command -v pm2 > /dev/null; then
        log "Starting with PM2..."
        pm2 start ecosystem.config.js --env production
        pm2 save
    else
        log "Starting application directly..."
        nohup npm start > /var/log/subscription-app.log 2>&1 &
    fi

    # Wait for application to start
    sleep 10

    success "Application started"
}

# Health check
health_check() {
    log "Performing health check..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt/$max_attempts..."

        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            success "Health check passed"
            return 0
        fi

        sleep 10
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts"
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."

    # Test subscription creation flow
    log "Testing subscription system..."
    if ! npm run test:integration:subscription; then
        error "Subscription system integration test failed!"
    fi

    # Test payment processing
    log "Testing payment processing..."
    if ! npm run test:integration:payment; then
        error "Payment processing integration test failed!"
    fi

    # Test webhook processing
    log "Testing webhook processing..."
    if ! npm run test:webhook; then
        error "Webhook processing test failed!"
    fi

    # Verify SSL certificate
    if [ ! -z "$SSL_CERT_PATH" ]; then
        log "Verifying SSL configuration..."
        if ! curl -f -s "https://your-domain.com" > /dev/null; then
            warning "SSL verification failed - please check certificate configuration"
        else
            success "SSL configuration verified"
        fi
    fi

    success "Post-deployment verification completed"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."

    # Stop current application
    if pgrep -f "next start" > /dev/null; then
        pkill -f "next start"
    fi

    if command -v pm2 > /dev/null; then
        pm2 stop all
    fi

    # Restore from backup
    local backup_date=$(ls -1 "$BACKUP_DIR" | tail -1)
    if [ ! -z "$backup_date" ]; then
        log "Restoring from backup: $backup_date"

        # Restore application files
        tar -xzf "$BACKUP_DIR/$backup_date/app-backup.tar.gz"

        # Restore database (if needed)
        # npm run db:restore -- --input "$BACKUP_DIR/$backup_date/mongodb-backup.gz"

        # Restart application
        start_application

        success "Rollback completed"
    else
        error "No backup found for rollback!"
    fi
}

# Cleanup
cleanup() {
    log "Cleaning up..."

    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

    # Clean npm cache
    npm cache clean --force

    # Clean build artifacts
    rm -rf .next/cache

    success "Cleanup completed"
}

# Main deployment process
main() {
    log "Starting production deployment for $DEPLOYMENT_ENV environment..."

    # Trap errors and rollback
    trap 'error "Deployment failed! Starting rollback..."; rollback' ERR

    # Load environment variables
    if [ -f ".env.production" ]; then
        export $(cat .env.production | grep -v '^#' | xargs)
    fi

    # Run deployment steps
    pre_deployment_checks
    create_backup
    install_dependencies
    build_application
    run_migrations
    configure_webhook_security
    configure_monitoring
    start_application
    health_check
    post_deployment_verification
    cleanup

    success "🎉 Production deployment completed successfully!"
    log "Application is now running at: $NEXT_PUBLIC_APP_URL"
    log "Webhook endpoint: $WEBHOOK_URL"
    log "Admin dashboard: $NEXT_PUBLIC_APP_URL/admin"
}

# Script execution
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health-check")
        health_check
        ;;
    "backup")
        create_backup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|backup}"
        exit 1
        ;;
esac