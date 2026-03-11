#!/bin/bash

# InvBot v2 - CLOB API Testing Script

API_URL="http://localhost:3000/api/v1"
COLORS=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test credentials
TEST_USERNAME="testuser"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="TestPassword123!"

echo -e "${BLUE}=== InvBot v2 CLOB API Testing ===${NC}\n"

# 1. Register user
echo -e "${YELLOW}1. Registering test user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "$REGISTER_RESPONSE" | jq .

# 2. Login
echo -e "\n${YELLOW}2. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq .

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Failed to get access token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Got access token${NC}"

# 3. Get user profile
echo -e "\n${YELLOW}3. Getting user profile...${NC}"
curl -s -X GET "$API_URL/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq .

# 4. Test CLOB endpoints (without initialization)
echo -e "\n${YELLOW}4. Testing CLOB endpoints (should fail without init)...${NC}"

echo -e "\n${BLUE}4a. Get orders (without init):${NC}"
curl -s -X GET "$API_URL/polymarket/clob/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\n${BLUE}4b. Get balance (without init):${NC}"
curl -s -X GET "$API_URL/polymarket/clob/balance-allowance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# 5. Test public orderbook endpoint
echo -e "\n${YELLOW}5. Testing public orderbook endpoint...${NC}"
# Using a sample Polymarket token ID (this would fail if CLOB client not initialized)
echo -e "${BLUE}5a. Get midpoint price (needs CLOB init):${NC}"
curl -s -X GET "$API_URL/polymarket/clob/midpoint/1234567890" | jq .

# 6. Reset CLOB
echo -e "\n${YELLOW}6. Testing reset endpoint...${NC}"
curl -s -X POST "$API_URL/polymarket/clob/reset" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\n${GREEN}=== Testing Complete ===${NC}\n"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Initialize CLOB client with: POST /polymarket/clob/init"
echo "2. Provide privateKey and funderAddress"
echo "3. Then test order creation, cancellation, etc."
echo ""
echo -e "${YELLOW}Example initialization:${NC}"
echo 'curl -X POST http://localhost:3000/api/v1/polymarket/clob/init \'
echo '  -H "Authorization: Bearer YOUR_TOKEN" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"privateKey\": \"0x...\", \"funderAddress\": \"0x...\"}"'
