# Converter API

API endpoints for currency conversion between XP and USDT.

## Endpoints

### 1. Get Conversion Rates
**GET** `/api/v1/converter/rates`

Get all active conversion rates.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "from": "xp",
      "to": "usdt",
      "rate": 0.0001,
      "minAmount": 100,
      "maxAmount": 1000000,
      "fee": 2
    },
    {
      "_id": "...",
      "from": "usdt",
      "to": "xp",
      "rate": 10000,
      "minAmount": 0.1,
      "maxAmount": 10000,
      "fee": 2
    }
  ]
}
```

### 2. Get Conversion History
**GET** `/api/v1/converter/history/:userId`

Get conversion history for a specific user.

**Parameters:**
- `userId` (path parameter) - User ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": 123456,
      "fromCurrency": "xp",
      "toCurrency": "usdt",
      "fromAmount": 10000,
      "toAmount": 0.98,
      "rate": 0.0001,
      "fee": 2,
      "status": "completed",
      "createdAt": "2025-11-03T00:00:00.000Z",
      "updatedAt": "2025-11-03T00:00:00.000Z"
    }
  ]
}
```

### 3. Convert Currency
**POST** `/api/v1/converter/convert`

Convert from one currency to another.

**Request Body:**
```json
{
  "userId": 123456,
  "fromCurrency": "xp",
  "toCurrency": "usdt",
  "amount": 10000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully converted 10000 XP to 0.98 USDT",
  "data": {
    "conversion": {
      "_id": "...",
      "userId": 123456,
      "fromCurrency": "xp",
      "toCurrency": "usdt",
      "fromAmount": 10000,
      "toAmount": 0.98,
      "rate": 0.0001,
      "fee": 2,
      "status": "completed",
      "createdAt": "2025-11-03T00:00:00.000Z"
    },
    "newBalances": {
      "xp": 90000,
      "usdt": 1.98
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Insufficient XP balance. Available: 5000"
}
```

## Supported Currencies
- `xp` - Experience Points
- `usdt` - USDT Stablecoin

## Conversion Logic

1. **Fee Calculation**: A percentage fee is deducted from the source amount
   - Example: 10,000 XP with 2% fee = 9,800 XP after fee
   
2. **Rate Application**: The rate is applied to the amount after fee
   - Example: 9,800 XP × 0.0001 = 0.98 USDT

3. **Balance Update**: Both source and destination balances are updated atomically using MongoDB transactions

## Setup

1. **Seed Initial Rates:**
   ```bash
   npm run seed:rates
   ```

2. **Default Rates:**
   - XP → USDT: 0.0001 (10,000 XP = 1 USDT), 2% fee
   - USDT → XP: 10,000 (1 USDT = 10,000 XP), 2% fee

## Database Models

### ConversionRate
Stores conversion rate configurations.

### ConversionHistory
Stores all conversion transactions for audit and history.

## Transaction Safety

All conversions use MongoDB transactions to ensure:
- Atomic balance updates
- No partial conversions
- Data consistency
- Rollback on errors
