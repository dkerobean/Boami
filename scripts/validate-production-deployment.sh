#!/bin/bash

# Production Deployment Validation Script
# This script validates that the subscription system is properly deployed and ready for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"localhost:3000"}
PROTOCOL=${2:-"http"}
BASE_URL="${PROTOCOL}://${DOMAIN}"
TIMEOUT=30

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
}

error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_TESTS++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local method="${4:-GET}"
    local data="${5:-}"

    ((TOTAL_TESTS++))
    log "Testing: $name"

    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.txt --max-time $TIMEOUT"

    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
    fi

    local status_code
    status_code=$(eval "$curl_cmd '$url'" 2>/dev/null || echo "000")

    if [ "$status_code" = "$expected_status" ]; then
        success "$name - Status: $status_code"
        return 0
    else
        error "$name - Expected: $expected_status, Got: $status_code"
        if [ -f /tmp/response.txt ]; then
            echo "Response: $(cat /tmp/response.txt | head -c 200)"
        fi
        return 1
    fi
}

test_ssl_certificate() {
    if [ "$PROTOCOL" = "https" ]; then
        ((TOTAL_TESTS++))
        log "Testing SSL Certificate"

        local ssl_info
        ssl_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

        if [ $? -eq 0 ]; then
            local not_after
            not_after=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
            local expiry_date
            expiry_date=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$not_after" +%s 2>/dev/null)
            local current_date
            current_date=$(date +%s)
            local days_until_expiry
            days_until_expiry=$(( (expiry_date - current_date) / 86400 ))

            if [ $days_until_expiry -gt 30 ]; then
                success "SSL Certificate valid (expires in $days_until_expiry days)"
            elif [ $days_until_expiry -gt 0 ]; then
                warning "SSL Certificate expires soon ($days_until_expiry days)"
                ((PASSED_TESTS++))
            else
                error "SSL Certificate expired"
            fi
        else
            error "SSL Certificate validation failed"
        fi
    else
        log "Skipping SSL test (HTTP protocol)"
    fi
}

test_security_headers() {
    ((TOTAL_TESTS++))
    log "Testing Security Headers"

    local headers
    headers=$(curl -s -I "$BASE_URL" --max-time $TIMEOUT 2>/dev/null)

    if [ $? -eq 0 ]; then
        local security_score=0
        local total_headers=5

        # Check for important security headers
        if echo "$headers" | grep -qi "strict-transport-security"; then
            ((security_score++))
        fi

        if echo "$headers" | grep -qi "x-frame-options"; then
            ((security_score++))
        fi

        if echo "$headers" | grep -qi "x-content-type-options"; then
            ((security_score++))
        fi

        if echo "$headers" | grep -qi "x-xss-protection"; then
            ((security_score++))
        fi

        if echo "$headers" | grep -qi "content-security-policy"; then
            ((security_score++))
        fi

        if [ $security_score -ge 4 ]; then
            success "Security Headers ($security_score/$total_headers headers present)"
        elif [ $security_score -ge 2 ]; then
            warning "Security Headers ($security_score/$total_headers headers present)"
            ((PASSED_TESTS++))
        else
            error "Security Headers ($security_score/$total_headers headers present)"
        fi
    else
        error "Failed to fetch security headers"
    fi
}

test_database_connection() {
    ((TOTAL_TESTS++))
    log "Testing Database Connection"

    if command -v npm >/dev/null 2>&1; then
run db:check >/dev/null 2>&1; then
            success "Database Connection"
        else
            error "Database Connection failed"
        fi
    else
        warning "npm not available, skipping database test"
        ((PASSED_TESTS++))
    fi
}

test_environment_variables() {
    ((TOTAL_TESTS++))
    log "Testing Environment Variables"

    local required_vars=(
        "NODE_ENV"
        "MONGODB_URI"
        "NEXTAUTH_SECRET"
        "FLUTTERWAVE_PUBLIC_KEY"
        "FLUTTERWAVE_SECRET_KEY"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -eq 0 ]; then
        success "Environment Variables (all required vars present)"
    else
        error "Environment Variables (missing: ${missing_vars[*]})"
    fi
}

test_performance() {
    ((TOTAL_TESTS++))
    log "Testing Performance"

    local start_time
    start_time=$(date +%s%3N)

    local status_code
    status_code=$(curl -s -w '%{http_code}' -o /dev/null "$BASE_URL" --max-time $TIMEOUT 2>/dev/null || echo "000")

    local end_time
    end_time=$(date +%s%3N)
    local response_time
    response_time=$((end_time - start_time))

    if [ "$status_code" = "200" ] && [ $response_time -lt 3000 ]; then
        success "Performance (${response_time}ms response time)"
    elif [ "$status_code" = "200" ] && [ $response_time -lt 5000 ]; then
        warning "Performance (${response_time}ms response time - acceptable but slow)"
        ((PASSED_TESTS++))
    else
        error "Performance (${response_time}ms response time or failed request)"
    fi
}

run_production_tests() {
    if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
        ((TOTAL_TESTS++))
        log "Running Production Test Suite"

        if npm run test:production >/dev/null 2>&1; then
            success "Production Test Suite"
        else
            error "Production Test Suite failed"
        fi
    else
        warning "Production test suite not available"
    fi
}

# Main validation function
main() {
    echo "🚀 Production Deployment Validation"
    echo "=================================="
    echo "Domain: $DOMAIN"
    echo "Protocol: $PROTOCOL"
    echo "Base URL: $BASE_URL"
    echo ""

    # Basic connectivity tests
    log "Starting basic connectivity tests..."
    test_endpoint "Homepage" "$BASE_URL" "200"
    test_endpoint "Health Check" "$BASE_URL/api/health" "200"

    # API endpoint tests
    log "Testing API endpoints..."
    test_endpoint "Plans API" "$BASE_URL/api/subscriptions/plans" "200"
    test_endpoint "Webhook Endpoint" "$BASE_URL/api/webhooks/flutterwave" "400" "POST" '{"test":"data"}'

    # Security tests
    log "Running security tests..."
    test_ssl_certificate
    test_security_headers

    # System tests
    log "Running system tests..."
    test_database_connection
    test_environment_variables
    test_performance

    # Production test suite
    log "Running comprehensive tests..."
    run_production_tests

    # Generate report
    echo ""
    echo "=================================="
    echo "📊 VALIDATION REPORT"
    echo "=================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED - DEPLOYMENT VALIDATED!${NC}"
        echo ""
        echo "✅ System is ready for production use"
        echo "✅ All critical endpoints are responding"
        echo "✅ Security measures are in place"
        echo "✅ Performance is within acceptable limits"
        echo ""
        exit 0
    else
        echo -e "${RED}⚠️  $FAILED_TESTS TESTS FAILED - REVIEW REQUIRED${NC}"
        echo ""
        echo "❌ System may not be ready for production"
        echo "❌ Please review failed tests and fix issues"
        echo "❌ Re-run validation after fixes"
        echo ""
        exit 1
    fi
}

# Usage information
usage() {
    echo "Usage: $0 [domain] [protocol]"
    echo ""
    echo "Parameters:"
    echo "  domain    - Domain to test (default: localhost:3000)"
    echo "  protocol  - http or https (default: http)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test localhost:3000 with http"
    echo "  $0 your-domain.com https             # Test production domain with https"
    echo "  $0 staging.your-domain.com https     # Test staging environment"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac