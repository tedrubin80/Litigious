#!/bin/bash

# Production Login Verification Script
# This script verifies that all production users can login successfully

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} Production Login Verification Test     ${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Test accounts
declare -a accounts=(
  "admin@legalestate.tech:admin123:SUPER_ADMIN"
  "attorney@legalestate.tech:attorney123:ADMIN"
  "paralegal@legalestate.tech:paralegal123:PARALEGAL"
  "client@legalestate.tech:client123:CLIENT"
)

success_count=0
failure_count=0

# Function to test login
test_login() {
  local email="$1"
  local password="$2"
  local role="$3"

  echo -e "${YELLOW}Testing $role account: $email${NC}"

  # Perform login
  response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" 2>/dev/null)

  # Check if login was successful
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Login successful${NC}"

    # Extract token (first 50 chars)
    token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4 | head -c 50)
    if [ -n "$token" ]; then
      echo -e "   Token: ${token}..."
    fi

    # Extract user role
    user_role=$(echo "$response" | grep -o '"role":"[^"]*' | cut -d'"' -f4)
    if [ -n "$user_role" ]; then
      echo -e "   Role: $user_role"
    fi

    ((success_count++))
  else
    echo -e "${RED}❌ Login failed${NC}"
    error_msg=$(echo "$response" | grep -o '"message":"[^"]*' | cut -d'"' -f4)
    if [ -n "$error_msg" ]; then
      echo -e "   Error: $error_msg"
    else
      echo -e "   Response: $response"
    fi
    ((failure_count++))
  fi

  echo
}

# Test each account
for account in "${accounts[@]}"; do
  IFS=':' read -r email password role <<< "$account"
  test_login "$email" "$password" "$role"
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} Test Summary                           ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Successful logins: $success_count${NC}"
echo -e "${RED}❌ Failed logins: $failure_count${NC}"

if [ $failure_count -eq 0 ]; then
  echo -e "\n${GREEN}🎉 All production accounts are working!${NC}"
  exit 0
else
  echo -e "\n${RED}⚠️  Some accounts failed to login. Please check the configuration.${NC}"
  exit 1
fi