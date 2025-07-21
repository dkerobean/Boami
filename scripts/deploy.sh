#!/bin/bash

# BOAMI Landing Page Deployment Script
# This script handles the production deployment of the landing page

set -e  # Exit on any error

echo "🚀 Starting BOAMI Landing Page Deployment..."

# Environment check
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

echo "📋 Environment: $NODE_ENV"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if required environment variables are set
required_vars=("NEXT_PUBLIC_GA_ID" "NEXT_PUBLIC_HOTJAR_ID")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set"
        exit 1
    fi
done

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run tests
echo "🧪 Running tests..."
npm run test:ci

# Build the application
echo "🏗️  Building application..."
npm run build

# Run performance audit
echo "📊 Running performance audit..."
if command -v lighthouse &> /dev/null; then
    lighthouse http://localhost:3000/landingpage --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless" || echo "⚠️  Lighthouse audit failed, continuing deployment..."
fi

# Security scan
echo "🔒 Running security scan..."
if command -v npm-audit &> /dev/null; then
    npm audit --audit-level=high || echo "⚠️  Security audit found issues, please review"
fi

# Bundle analysis (optional)
if [ "$ANALYZE_BUNDLE" = "true" ]; then
    echo "📈 Analyzing bundle size..."
    ANALYZE=true npm run build
fi

# Deploy to production (customize based on your deployment platform)
echo "🚀 Deploying to production..."

# Example for Vercel
if [ "$DEPLOYMENT_PLATFORM" = "vercel" ]; then
    npx vercel --prod
# Example for Netlify
elif [ "$DEPLOYMENT_PLATFORM" = "netlify" ]; then
    npx netlify deploy --prod --dir=out
# Example for custom server
elif [ "$DEPLOYMENT_PLATFORM" = "custom" ]; then
    # Copy build files to server
    rsync -avz --delete .next/ $DEPLOY_SERVER:$DEPLOY_PATH/
    # Restart application
    ssh $DEPLOY_SERVER "pm2 restart boami-landing"
else
    echo "ℹ️  No deployment platform specified, skipping deployment"
fi

# Post-deployment verification
echo "✅ Running post-deployment verification..."

# Health check
if [ ! -z "$PRODUCTION_URL" ]; then
    echo "🏥 Checking application health..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/landingpage")
    if [ $response -eq 200 ]; then
        echo "✅ Application is healthy (HTTP $response)"
    else
        echo "❌ Application health check failed (HTTP $response)"
        exit 1
    fi

    # Performance check
    echo "⚡ Running performance check..."
    if command -v curl &> /dev/null; then
        load_time=$(curl -o /dev/null -s -w "%{time_total}" "$PRODUCTION_URL/landingpage")
        echo "📊 Page load time: ${load_time}s"

        # Alert if load time is too high
        if (( $(echo "$load_time > 3.0" | bc -l) )); then
            echo "⚠️  Warning: Page load time is high (${load_time}s)"
        fi
    fi
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -f lighthouse-report.json

echo "🎉 Deployment completed successfully!"
echo "🌐 Landing page is now live at: $PRODUCTION_URL/landingpage"

# Send notification (optional)
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚀 BOAMI Landing Page deployed successfully to production!"}' \
        $SLACK_WEBHOOK
fi

echo "📝 Deployment summary:"
echo "   - Environment: $NODE_ENV"
echo "   - Build time: $(date)"
echo "   - Deployment platform: ${DEPLOYMENT_PLATFORM:-'Not specified'}"
echo "   - Production URL: ${PRODUCTION_URL:-'Not specified'}"