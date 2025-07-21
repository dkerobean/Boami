# BOAMI Landing Page Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Set up production environment variables
- [ ] Configure Google Analytics 4 tracking ID
- [ ] Set up Hotjar tracking ID
- [ ] Configure CDN for static assets
- [ ] Set up SSL certificates

### 2. Performance Optimization
- [ ] Run bundle analysis (`ANALYZE=true npm run build`)
- [ ] Optimize images and convert to WebP/AVIF
- [ ] Enable compression and caching
- [ ] Configure CDN for static assets
- [ ] Test Core Web Vitals scores

### 3. Security Configuration
- [ ] Configure security headers
- [ ] Set up Content Security Policy
- [ ] Enable HTTPS redirect
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting

### 4. SEO and Analytics
- [ ] Verify meta tags and structured data
- [ ] Submit sitemap to search engines
- [ ] Set up Google Search Console
- [ ] Configure conversion tracking
- [ ] Test social media sharing

### 5. Testing
- [ ] Run automated tests (`npm run test:ci`)
- [ ] Perform cross-browser testing
- [ ] Test mobile responsiveness
- [ ] Validate accessibility compliance
- [ ] Load testing and performance testing

## Deployment Steps

### 1. Build and Test
```bash
# Install dependencies
npm ci

# Run tests
npm run test:ci

# Build for production
NODE_ENV=production npm run build

# Start production server (for testing)
npm start
```

### 2. Performance Audit
```bash
# Run Lighthouse audit
lighthouse http://localhost:3000/landingpage --output=json --output-path=./lighthouse-report.json

# Analyze bundle size
ANALYZE=true npm run build
```

### 3. Deploy to Production

#### Option A: Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

#### Option B: Netlify Deployment
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build for static export
EXPORT=true npm run build

# Deploy to production
netlify deploy --prod --dir=out
```

#### Option C: Custom Server Deployment
```bash
# Build application
npm run build

# Copy files to server
rsync -avz --delete .next/ user@server:/path/to/app/

# Restart application
ssh user@server "pm2 restart boami-landing"
```

### 4. Post-Deployment Verification

#### Health Checks
```bash
# Check application status
curl -I https://boami.com/landingpage

# Test API endpoints
curl https://boami.com/api/health

# Verify SSL certificate
openssl s_client -connect boami.com:443 -servername boami.com
```

#### Performance Verification
```bash
# Test page load time
curl -o /dev/null -s -w "%{time_total}" https://boami.com/landingpage

# Run Core Web Vitals test
lighthouse https://boami.com/landingpage --only-categories=performance
```

## Environment Variables

### Required Production Variables
```env
NODE_ENV=production
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_HOTJAR_ID=1234567
NEXT_PUBLIC_SITE_URL=https://boami.com
```

### Optional Variables
```env
ANALYZE=false
EXPORT=false
DEPLOYMENT_PLATFORM=vercel
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Monitoring and Maintenance

### 1. Set Up Monitoring
- Configure uptime monitoring (Pingdom, UptimeRobot, etc.)
- Set up error tracking (Sentry, Bugsnag, etc.)
- Configure performance monitoring (New Relic, DataDog, etc.)
- Set up log aggregation (LogRocket, Papertrail, etc.)

### 2. Regular Maintenance Tasks

#### Daily
- [ ] Check application health and uptime
- [ ] Review error logs and fix critical issues
- [ ] Monitor performance metrics

#### Weekly
- [ ] Review analytics and conversion metrics
- [ ] Update dependencies with security patches
- [ ] Run performance audits
- [ ] Review and optimize Core Web Vitals

#### Monthly
- [ ] Comprehensive security audit
- [ ] A/B test analysis and optimization
- [ ] Content updates and improvements
- [ ] Backup verification and disaster recovery testing

### 3. Performance Targets

#### Core Web Vitals
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1

#### Additional Metrics
- **First Contentful Paint (FCP)**: < 1.8 seconds
- **Time to Interactive (TTI)**: < 3.8 seconds
- **Total Blocking Time (TBT)**: < 200 milliseconds

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

#### Performance Issues
```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check for unused dependencies
npx depcheck

# Optimize images
npx next-optimized-images
```

#### SEO Issues
```bash
# Validate structured data
curl -s "https://search.google.com/structured-data/testing-tool/u/0/?url=https://boami.com/landingpage"

# Check meta tags
curl -s https://boami.com/landingpage | grep -i "<meta"
```

## Rollback Procedure

### Quick Rollback
1. Identify the last known good deployment
2. Revert to previous version using platform-specific commands
3. Verify application functionality
4. Update monitoring and alerting

### Vercel Rollback
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url]
```

### Custom Server Rollback
```bash
# Switch to previous version
ln -sfn /path/to/previous/version /path/to/current

# Restart application
pm2 restart boami-landing
```

## Support and Contacts

- **Development Team**: dev-team@boami.com
- **DevOps Team**: devops@boami.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Slack Channel**: #boami-alerts

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Netlify Deployment Guide](https://docs.netlify.com/)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse Performance Auditing](https://developers.google.com/web/tools/lighthouse)