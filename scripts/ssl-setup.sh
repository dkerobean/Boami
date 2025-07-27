#!/bin/bash

# SSL Certificate Setup and Validation Script
# This script handles SSL certificate installation, validation, and renewal

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@your-domain.com"}
CERT_DIR="/etc/ssl/certs/subscription-system"
KEY_DIR="/etc/ssl/private/subscription-system"
NGINX_CONF="/etc/nginx/sites-available/subscription-system"
WEBHOOK_DOMAIN="$DOMAIN"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Install required packages
install_dependencies() {
    log "Installing required packages..."

    # Update package list
    apt-get update

    # Install certbot and nginx
    apt-get installt python3-certbot-nginx nginx openssl

    success "Dependencies installed"
}

# Setup directories
setup_directories() {
    log "Setting up SSL directories..."

    mkdir -p "$CERT_DIR"
    mkdir -p "$KEY_DIR"

    # Set proper permissions
    chmod 755 "$CERT_DIR"
    chmod 700 "$KEY_DIR"

    success "SSL directories created"
}

# Generate self-signed certificate (for development/testing)
generate_self_signed() {
    log "Generating self-signed certificate for $DOMAIN..."

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_DIR/$DOMAIN.key" \
        -out "$CERT_DIR/$DOMAIN.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=$DOMAIN"

    # Set proper permissions
    chmod 600 "$KEY_DIR/$DOMAIN.key"
    chmod 644 "$CERT_DIR/$DOMAIN.crt"

    success "Self-signed certificate generated"
}

# Obtain Let's Encrypt certificate
obtain_letsencrypt_cert() {
    log "Obtaining Let's Encrypt certificate for $DOMAIN..."

    # Stop nginx temporarily
    systemctl stop nginx 2>/dev/null || true

    # Obtain certificate
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        -d "api.$DOMAIN"

    # Copy certificates to our directory
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/$DOMAIN.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$KEY_DIR/$DOMAIN.key"

    # Set proper permissions
    chmod 600 "$KEY_DIR/$DOMAIN.key"
    chmod 644 "$CERT_DIR/$DOMAIN.crt"

    success "Let's Encrypt certificate obtained"
}

# Configure nginx
configure_nginx() {
    log "Configuring nginx..."

    cat > "$NGINX_CONF" << EOF
# Subscription System Nginx Configuration

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=webhook:10m rate=5r/s;

# Upstream for Next.js application
upstream subscription_app {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration
    ssl_certificate $CERT_DIR/$DOMAIN.crt;
    ssl_certificate_key $KEY_DIR/$DOMAIN.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.flutterwave.com https://checkout.flutterwave.com;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client max body size (for file uploads)
    client_max_body_size 10M;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;

    # Main application
    location / {
        proxy_pass http://subscription_app;
    }

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://subscription_app;
    }

    # Webhook endpoint with special rate limiting
    location /api/webhooks/ {
        limit_req zone=webhook burst=10 nodelay;

        # Allow only Flutterwave IPs (update these as needed)
        allow 52.214.14.220;
        allow 52.49.173.169;
        allow 52.214.14.217;
        allow 127.0.0.1; # For testing
        deny all;

        proxy_pass http://subscription_app;
    }

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://subscription_app;
        access_log off;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://subscription_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Favicon
    location /favicon.ico {
        proxy_pass http://subscription_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Robots.txt
    location /robots.txt {
        proxy_pass http://subscription_app;
        expires 1d;
    }
}

# API subdomain (optional)
server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;

    # SSL Configuration (same as main server)
    ssl_certificate $CERT_DIR/$DOMAIN.crt;
    ssl_certificate_key $KEY_DIR/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # CORS headers for API
    add_header Access-Control-Allow-Origin "https://$DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

    # Handle preflight requests
    location / {
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$DOMAIN";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain charset=UTF-8";
            add_header Content-Length 0;
            return 204;
        }

        # Rewrite to /api path
        rewrite ^/(.*)$ /api/\$1 break;
        proxy_pass http://subscription_app;

        # Proxy settings
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable the site
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    # Test nginx configuration
    nginx -t

    success "Nginx configured"
}

# Setup certificate renewal
setup_renewal() {
    log "Setting up certificate renewal..."

    # Create renewal script
    cat > /usr/local/bin/renew-subscription-ssl.sh << 'EOF'
#!/bin/bash

# Certificate renewal script for subscription system

DOMAIN="$1"
CERT_DIR="/etc/ssl/certs/subscription-system"
KEY_DIR="/etc/ssl/private/subscription-system"

# Renew certificate
certbot renew --quiet

# Copy renewed certificates
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/$DOMAIN.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$KEY_DIR/$DOMAIN.key"

    # Set permissions
    chmod 600 "$KEY_DIR/$DOMAIN.key"
    chmod 644 "$CERT_DIR/$DOMAIN.crt"

    # Reload nginx
    systemctl reload nginx

    echo "Certificate renewed and nginx reloaded"
fi
EOF

    chmod +x /usr/local/bin/renew-subscription-ssl.sh

    # Add cron job for renewal
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/renew-subscription-ssl.sh $DOMAIN") | crontab -

    success "Certificate renewal configured"
}

# Validate SSL configuration
validate_ssl() {
    log "Validating SSL configuration..."

    # Check certificate validity
    if ! openssl x509 -in "$CERT_DIR/$DOMAIN.crt" -noout -checkend 86400; then
        error "SSL certificate is invalid or will expire within 24 hours"
    fi

    # Check private key
    if [ ! -f "$KEY_DIR/$DOMAIN.key" ]; then
        error "Private key not found"
    fi

    # Verify certificate and key match
    cert_hash=$(openssl x509 -noout -modulus -in "$CERT_DIR/$DOMAIN.crt" | openssl md5)
    key_hash=$(openssl rsa -noout -modulus -in "$KEY_DIR/$DOMAIN.key" | openssl md5)

    if [ "$cert_hash" != "$key_hash" ]; then
        error "Certificate and private key do not match"
    fi

    # Test nginx configuration
    if ! nginx -t; then
        error "Nginx configuration is invalid"
    fi

    success "SSL configuration validated"
}

# Start services
start_services() {
    log "Starting services..."

    # Start and enable nginx
    systemctl start nginx
    systemctl enable nginx

    # Reload systemd
    systemctl daemon-reload

    success "Services started"
}

# Test HTTPS connection
test_https() {
    log "Testing HTTPS connection..."

    # Wait for nginx to start
    sleep 5

    # Test HTTPS connection
    if curl -f -s "https://$DOMAIN" > /dev/null; then
        success "HTTPS connection test passed"
    else
        warning "HTTPS connection test failed - this may be expected if DNS is not configured yet"
    fi

    # Test webhook endpoint
    if curl -f -s "https://$DOMAIN/api/webhooks/flutterwave" > /dev/null; then
        success "Webhook endpoint accessible"
    else
        warning "Webhook endpoint test failed - this may be expected"
    fi
}

# Main function
main() {
    log "Starting SSL setup for domain: $DOMAIN"

    check_root
    install_dependencies
    setup_directories

    # Choose certificate type
    if [ "$3" = "self-signed" ]; then
        generate_self_signed
    else
        obtain_letsencrypt_cert
        setup_renewal
    fi

    configure_nginx
    validate_ssl
    start_services
    test_https

    success "🎉 SSL setup completed successfully!"
    log "Your subscription system is now accessible at: https://$DOMAIN"
    log "Webhook endpoint: https://$DOMAIN/api/webhooks/flutterwave"
    log "Admin dashboard: https://$DOMAIN/admin"
}

# Usage information
usage() {
    echo "Usage: $0 <domain> <email> [self-signed]"
    echo "  domain: Your domain name (e.g., example.com)"
    echo "  email: Email for Let's Encrypt registration"
    echo "  self-signed: Use self-signed certificate instead of Let's Encrypt"
    echo ""
    echo "Examples:"
    echo "  $0 example.com admin@example.com"
    echo "  $0 localhost admin@localhost.com self-signed"
}

# Script execution
if [ $# -lt 2 ]; then
    usage
    exit 1
fi

main "$@"