# Polymarket CLOB Integration Guide

## Overview

This integration adds support for trading on Polymarket's CLOB (Central Limit Order Book) directly from InvBot v2.

## Architecture

### Services

- **`polymarket-clob.service.ts`**: Core CLOB client wrapper providing:
  - Client initialization
  - API key management
  - Order creation and management
  - Order book access
  - Market conditions
  - Position tracking
  - Balance management

### API Routes

- **POST** `/api/v1/polymarket/clob/init` - Initialize CLOB client
- **POST** `/api/v1/polymarket/clob/orders` - Create an order
- **GET** `/api/v1/polymarket/clob/orders` - Get all user orders
- **GET** `/api/v1/polymarket/clob/orders/:orderId` - Get order details
- **DELETE** `/api/v1/polymarket/clob/orders/:orderId` - Cancel an order
- **GET** `/api/v1/polymarket/clob/orderbook/:tokenId` - Get order book
- **GET** `/api/v1/polymarket/clob/market-conditions/:tokenId` - Get bid/ask prices
- **GET** `/api/v1/polymarket/clob/balance` - Get USDC balance
- **GET** `/api/v1/polymarket/clob/positions` - Get open positions
- **POST** `/api/v1/polymarket/clob/reset` - Reset CLOB client

## Setup

### 1. Installation

Dependencies are already installed:
- `@polymarket/clob-client` - Official Polymarket CLOB client
- `ethers` - Ethereum library for wallet management

### 2. Initialization

Before trading, initialize the CLOB client with your private key:

```bash
POST /api/v1/polymarket/clob/init
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "privateKey": "0x...",  // Your Polygon private key
  "funderAddress": "0x..."  // Optional: your Polymarket profile address
}
```

**Response:**
```json
{
  "success": true,
  "message": "CLOB client initialized",
  "walletAddress": "0x...",
  "hasApiKeys": true
}
```

## Usage Examples

### Create an Order (BUY)

```bash
POST /api/v1/polymarket/clob/orders
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "tokenID": "12345",  // Market token ID from Polymarket API
  "price": 0.65,       // Limit price (0.0 - 1.0)
  "side": "BUY",       // BUY or SELL
  "size": 10,          // Number of shares
  "tickSize": "0.001",  // Market tick size
  "negRisk": false,    // Negative risk market?
  "orderType": "GTC"   // GTC, IOC, FOK, PO
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "orderID": "0x...",
    "transactionHash": "0x...",
    "status": "created",
    "success": true
  }
}
```

### Create an Order (SELL)

```bash
POST /api/v1/polymarket/clob/orders
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "tokenID": "12345",
  "price": 0.35,
  "side": "SELL",
  "size": 5,
  "tickSize": "0.001",
  "negRisk": false,
  "orderType": "GTC"
}
```

### Get All Orders

```bash
GET /api/v1/polymarket/clob/orders
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "orderID": "0x...",
      "tokenID": "12345",
      "side": "BUY",
      "price": 0.65,
      "quantity": 10,
      "filledQuantity": 5,
      "status": "partially_filled",
      "createdAt": "2026-03-11T12:00:00Z",
      "updatedAt": "2026-03-11T12:05:00Z"
    }
  ],
  "count": 1
}
```

### Get Order Book (Public - no auth required)

```bash
GET /api/v1/polymarket/clob/orderbook/12345
```

**Response:**
```json
{
  "success": true,
  "orderBook": {
    "tokenID": "12345",
    "bids": [
      { "price": "0.65", "size": "100" },
      { "price": "0.64", "size": "200" }
    ],
    "asks": [
      { "price": "0.66", "size": "150" },
      { "price": "0.67", "size": "250" }
    ]
  }
}
```

### Get Market Conditions (Public)

```bash
GET /api/v1/polymarket/clob/market-conditions/12345
```

**Response:**
```json
{
  "success": true,
  "conditions": {
    "tokenID": "12345",
    "bid": "0.65",
    "ask": "0.66",
    "mid": "0.655",
    "lastTradePrice": "0.65"
  }
}
```

### Check Balance

```bash
GET /api/v1/polymarket/clob/balance
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "balance": "5000.00",
  "currency": "USDC"
}
```

### Get Positions

```bash
GET /api/v1/polymarket/clob/positions
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "tokenID": "12345",
      "size": 5,
      "notional": "3.25"
    },
    {
      "tokenID": "12346",
      "size": -10,
      "notional": "6.50"
    }
  ],
  "count": 2
}
```

### Cancel an Order

```bash
DELETE /api/v1/polymarket/clob/orders/0x...
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Order 0x... cancelled"
}
```

## Order Types

| Type | Code | Description |
|------|------|-------------|
| Good-Til-Cancel | `GTC` | Order remains open until manually cancelled |
| Immediate-Or-Cancel | `IOC` | Order fills immediately or is cancelled |
| Fill-Or-Kill | `FOK` | Order must fill completely or be cancelled |
| Post-Only | `PO` | Order only posts to order book, never matches |

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200** - Success
- **201** - Resource created
- **400** - Bad request (validation error)
- **401** - Unauthorized (missing/invalid auth)
- **404** - Not found
- **500** - Server error

Error responses follow this format:
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Common Errors

### CLOB client not initialized
```json
{
  "success": false,
  "error": "CLOB client not initialized. Call /polymarket/clob/init first"
}
```

**Solution:** Call the init endpoint with your private key first.

### Invalid order parameters
```json
{
  "success": false,
  "error": "Missing required fields: tokenID, price, side, size, tickSize"
}
```

**Solution:** Verify all required fields are present and correctly formatted.

### Insufficient balance
When trying to place an order without USDC balance.

**Solution:** Deposit USDC to your Polymarket account.

## Integration with Strategies

To use CLOB trading in your strategies:

```typescript
import { polymarketClobService, TradeSide, OrderTypeEnum } from '../services/polymarket-clob.service';

// In your strategy execution
async function executeStrategy(tokenID: string, signal: 'buy' | 'sell') {
  // Check if client is initialized
  if (!polymarketClobService.isInitialized()) {
    throw new Error('CLOB client not initialized');
  }

  // Get market conditions
  const conditions = await polymarketClobService.getMarketConditions(tokenID);
  if (!conditions) {
    throw new Error('Market not found');
  }

  // Create order
  const order = await polymarketClobService.createAndPostOrder(
    {
      tokenID,
      price: parseFloat(signal === 'buy' ? conditions.bid : conditions.ask),
      side: signal === 'buy' ? TradeSide.BUY : TradeSide.SELL,
      size: 10,
    },
    { tickSize: '0.001', negRisk: false },
    OrderTypeEnum.GOOD_TILL_CANCEL
  );

  return order;
}
```

## Security Considerations

⚠️ **WARNING: Storing private keys securely is critical**

Current implementation stores private keys in memory. For production use:

1. **Use environment variables** for private key storage
2. **Rotate API keys regularly**
3. **Use separate wallets** for each trading strategy
4. **Implement withdrawal limits** to prevent loss of funds
5. **Audit all trades** for suspicious activity
6. **Use hardware wallets** for large balances

Example with .env:
```env
POLYMARKET_PRIVATE_KEY=0x...
POLYMARKET_FUNDER_ADDRESS=0x...
```

Then in code:
```typescript
await polymarketClobService.initialize(
  process.env.POLYMARKET_PRIVATE_KEY!,
  process.env.POLYMARKET_FUNDER_ADDRESS
);
```

## Monitoring

Monitor these events in your application:

1. **Order Creation** - Log successful order creation
2. **Partial Fills** - Track partially filled orders
3. **Order Cancellations** - Log cancelled orders
4. **Balance Changes** - Monitor USDC balance changes
5. **Errors** - Log API errors and network issues

## API Rate Limits

Polymarket CLOB has the following rate limits:

- **Public endpoints**: 100 requests/minute
- **Authenticated endpoints**: 50 requests/minute per user
- **Order submission**: 10 orders/minute per user

Implement exponential backoff for rate limit handling.

## Troubleshooting

### "Network error" or "Connection timeout"
- Verify internet connectivity
- Check Polymarket CLOB status: https://clob.polymarket.com/status
- Retry with exponential backoff

### "Order not found" after submission
- CLOB may be slow to index Orders
- Wait 1-2 seconds before querying
- Confirm order was created via transaction hash

### "Invalid private key"
- Ensure key is valid Polygon private key (256-bit hex string)
- Key should NOT include '0x' prefix
- Verify key is for Polygon network (chainId 137)

## Resources

- **Polymarket Docs**: https://docs.polymarket.com/
- **CLOB Client GitHub**: https://github.com/Polymarket/clob-client
- **Gamma Markets API**: https://docs.polymarket.com/developers/gamma-markets-api
- **USDC on Polygon**: https://polygonscan.com/token/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

## Next Steps

1. Test CLOB integration with small amounts
2. Implement risk management rules
3. Add monitoring and alerting
4. Build automated trading strategies
5. Scale gradually with increased capital

## Support

For issues or questions:
1. Check server logs: `docker logs invbot_app`
2. Enable debug logging in PolymarketClobService
3. Test endpoints manually with curl/Postman
4. Check Polymarket documentation
