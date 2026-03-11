#!/bin/bash

# InvBot v2 - CLOB API Testing Script with Unique User

API_URL="http://localhost:3000/api/v1"

# Generate unique username
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_$TIMESTAMP"
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPassword123!"

echo "=== InvBot v2 CLOB API Testing ==="
echo ""

# 1. Register new user
echo "1️⃣  Registering test user: $TEST_USERNAME..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "$REGISTER_RESPONSE" | jq .
echo ""

# 2. Login
echo "2️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq .
echo ""

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

echo "✅ Got access token: ${ACCESS_TOKEN:0:20}..."
echo ""

# 3. Get user profile
echo "3️⃣  Getting user profile..."
curl -s -X GET "$API_URL/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq .
echo ""

# 4. Test CLOB endpoints (without initialization)
echo "4️⃣  Testing CLOB endpoints without initialization..."
echo ""

echo "  4a. GET /polymarket/clob/orders (should fail):"
curl -s -X GET "$API_URL/polymarket/clob/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
echo ""

echo "  4b. GET /polymarket/clob/balance-allowance (should fail):"
curl -s -X GET "$API_URL/polymarket/clob/balance-allowance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
echo ""

# 5. Test health endpoint
echo "5️⃣  Testing server health..."
curl -s -X GET "http://localhost:3000/health" | jq .
echo ""

echo "6️⃣  Testing API version..."
curl -s -X GET "http://localhost:3000/api/version" | jq .
echo ""

echo "✅ Testing Complete!"
echo ""
echo "Test credentials saved:"
echo "  Username: $TEST_USERNAME"
echo "  Email: $TEST_EMAIL"
echo "  Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""
echo "To test CLOB initialization, you would need a valid Polymarket private key:"
echo ""
echo "curl -X POST $API_URL/polymarket/clob/init \\"
echo "  -H \"Authorization: Bearer $ACCESS_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"privateKey\": \"0x...\", \"funderAddress\": \"0x...\"}'"
