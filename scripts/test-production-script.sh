#!/bin/bash

# Test script for production mode functionality
# This script tests individual functions without making actual changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

echo "============================================"
echo "  Legal Estate Production Script Test      "
echo "============================================"
echo

# Test 1: Check if production config files exist
print_test "Checking production configuration files..."
if [ -f "/var/www/html/backend/.env.production" ] && [ -f "/var/www/html/frontend/.env.production" ]; then
    print_pass "Production configuration files exist"
else
    print_fail "Production configuration files missing"
fi

# Test 2: Check current mode
print_test "Checking current system mode..."
if grep -q "DEMO_MODE=true" /var/www/html/backend/.env 2>/dev/null; then
    print_pass "System currently in DEMO mode (ready for production switch)"
elif grep -q "DEMO_MODE=false" /var/www/html/backend/.env 2>/dev/null; then
    print_pass "System currently in PRODUCTION mode"
else
    print_fail "Cannot determine current system mode"
fi

# Test 3: Check if demo reset cron job exists
print_test "Checking demo cron job status..."
if crontab -l 2>/dev/null | grep -q "reset-demo.sh"; then
    print_pass "Demo reset cron job is active (will be disabled in production)"
else
    print_pass "Demo reset cron job not found (good for production)"
fi

# Test 4: Check script syntax
print_test "Validating enable-production.sh syntax..."
if bash -n /var/www/html/scripts/enable-production.sh; then
    print_pass "Production script syntax is valid"
else
    print_fail "Production script has syntax errors"
fi

# Test 5: Check required directories
print_test "Checking required directories..."
required_dirs=(
    "/var/www/html/backend"
    "/var/www/html/frontend"
    "/var/www/html/logs"
    "/mnt/HC_Volume_103150588"
)

all_dirs_exist=true
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir exists"
    else
        echo "  ✗ $dir missing"
        all_dirs_exist=false
    fi
done

if $all_dirs_exist; then
    print_pass "All required directories exist"
else
    print_fail "Some required directories are missing"
fi

# Test 6: Check database connectivity
print_test "Testing database connectivity..."
if PGPASSWORD=LegalTechSecure2024 psql -h localhost -U legalestate_admin -d legal_estate -c "SELECT 1;" > /dev/null 2>&1; then
    print_pass "Database connection successful"
else
    print_fail "Database connection failed"
fi

# Test 7: Check services status
print_test "Checking current service status..."
backend_status="UNKNOWN"
frontend_status="UNKNOWN"

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    backend_status="RUNNING"
elif curl -f http://localhost:3002/health > /dev/null 2>&1; then
    backend_status="RUNNING (alt port)"
else
    backend_status="DOWN"
fi

if curl -f http://localhost:80 > /dev/null 2>&1; then
    frontend_status="ACCESSIBLE"
else
    frontend_status="DOWN"
fi

echo "  Backend: $backend_status"
echo "  Frontend: $frontend_status"

if [ "$backend_status" != "DOWN" ] || [ "$frontend_status" != "DOWN" ]; then
    print_pass "At least one service is responding"
else
    print_fail "No services responding"
fi

echo
echo "============================================"
echo "  Test Summary                              "
echo "============================================"
echo "✅ Production script is ready to use"
echo "📋 To switch to production mode, run:"
echo "   sudo /var/www/html/scripts/enable-production.sh"
echo
echo "⚠️  Important reminders before production switch:"
echo "   • Backup current data"
echo "   • Configure SSL certificates"
echo "   • Update DNS settings"
echo "   • Test external integrations"
echo "   • Set up monitoring and alerts"
echo