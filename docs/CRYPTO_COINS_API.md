# Crypto Coins API Routes - Complete Documentation

## Overview
Comprehensive API endpoints for managing cryptocurrency coins and their network configurations.

## Recent Updates

### ✅ Fixed Default Crypto Coins Data
- Added all required fields to match the `CryptoCoin` model schema
- Included proper network configurations with RPC URLs
- Added support for multiple networks per coin (testnet and mainnet)
- Added Ethereum (ETH) and Tron (TRX) to default coins

### ✅ New Endpoints Added
1. Get active coins only
2. Get coins by network
3. Toggle coin status
4. Network management (add, update, delete, toggle)
5. Statistics overview

---

## Default Crypto Coins

The system now includes 4 default cryptocurrencies:

| Coin | Symbol | Networks | Status |
|------|--------|----------|--------|
| Tether | USDT | BEP20 (Testnet & Mainnet) | Active |
| Binance Coin | BNB | BEP20 (Testnet & Mainnet) | Active |
| Ethereum | ETH | ERC20 (Mainnet) | Active |
| Tron | TRX | TRC20 (Mainnet) | Active |

---

## API Endpoints

### Public Endpoints

#### 1. Get All Crypto Coins
```http
GET /crypto-coins
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "usdt",
      "name": "Tether",
      "symbol": "USDT",
      "icon": "/svg/color/usdt.svg",
      "status": "active",
      "networks": [...]
    }
  ],
  "message": "Crypto coins fetched successfully"
}
```

**Features:**
- Auto-seeds default coins if database is empty
- Returns all coins sorted by name
- Includes complete network information

---

#### 2. Get Single Crypto Coin
```http
GET /crypto-coins/:id
```

**Parameters:**
- `id` - Coin identifier (e.g., "usdt", "bnb")

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usdt",
    "name": "Tether",
    "symbol": "USDT",
    "networks": [...]
  },
  "message": "Crypto coin fetched successfully"
}
```

---

#### 3. Get Active Coins Only
```http
GET /crypto-coins/active/list
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 4,
  "message": "Active crypto coins fetched successfully"
}
```

**Use Case:** For displaying available coins to users

---

#### 4. Get Coins by Network
```http
GET /crypto-coins/network/:networkId
```

**Parameters:**
- `networkId` - Network identifier (e.g., "bep20-testnet", "erc20-mainnet")

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 2,
  "message": "Coins supporting bep20-testnet network fetched successfully"
}
```

**Use Case:** Filter coins by specific blockchain network

---

#### 5. Get Crypto Statistics
```http
GET /crypto-coins/stats/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coins": {
      "total": 4,
      "active": 4,
      "disabled": 0
    },
    "networks": {
      "total": 7,
      "active": 7,
      "inactive": 0,
      "uniqueTypes": ["bep20-testnet", "bep20-mainnet", "erc20-mainnet", "trc20-mainnet"]
    }
  },
  "message": "Statistics fetched successfully"
}
```

**Use Case:** Admin dashboard overview

---

### Admin Endpoints

#### 6. Create Crypto Coin
```http
POST /admin/crypto-coins
```

**Request Body:**
```json
{
  "id": "btc",
  "name": "Bitcoin",
  "symbol": "BTC",
  "icon": "/svg/color/btc.svg",
  "status": "active",
  "networks": [
    {
      "id": "btc-mainnet",
      "name": "Bitcoin Mainnet",
      "network": "btc-mainnet",
      "isDefault": true,
      "minDeposit": "0.0001",
      "minimumWithdraw": "0.0005",
      "withdrawFee": "0.0002",
      "fee": "0.0001",
      "requiresMemo": false,
      "confirmations": 6,
      "estimatedTime": "~60 min",
      "rpcUrl": "https://bitcoin-rpc.example.com",
      "type": "Native",
      "isActive": true
    }
  ]
}
```

**Validation:**
- All fields are required
- Networks array must not be empty
- Coin ID must be unique

---

#### 7. Update Crypto Coin
```http
PUT /admin/crypto-coins/:id
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "symbol": "SYMBOL",
  "icon": "/new/icon.svg",
  "status": "disabled",
  "networks": [...]
}
```

**Note:** Providing `networks` array replaces all existing networks

---

#### 8. Delete Crypto Coin
```http
DELETE /admin/crypto-coins/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Crypto coin deleted successfully"
}
```

---

#### 9. Toggle Coin Status
```http
PATCH /admin/crypto-coins/:id/toggle-status
```

**Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Crypto coin activated successfully"
}
```

**Use Case:** Quick enable/disable without full update

---

### Network Management Endpoints

#### 10. Add Network to Coin
```http
POST /admin/crypto-coins/:id/networks
```

**Request Body:**
```json
{
  "id": "usdt-trc20-mainnet",
  "name": "TRC20 (Tron Mainnet)",
  "network": "trc20-mainnet",
  "isDefault": false,
  "minDeposit": "10",
  "minimumWithdraw": "5",
  "withdrawFee": "1",
  "fee": "1",
  "requiresMemo": false,
  "confirmations": 20,
  "estimatedTime": "~3 min",
  "rpcUrl": "https://api.trongrid.io",
  "type": "TRC20",
  "isActive": true
}
```

**Validation:**
- Required fields: `id`, `name`, `network`, `rpcUrl`
- Network ID must be unique within the coin

---

#### 11. Update Network in Coin
```http
PUT /admin/crypto-coins/:coinId/networks/:networkId
```

**Request Body:** (partial update supported)
```json
{
  "withdrawFee": "0.5",
  "minimumWithdraw": "3",
  "isActive": true
}
```

---

#### 12. Delete Network from Coin
```http
DELETE /admin/crypto-coins/:coinId/networks/:networkId
```

**Validation:**
- Cannot delete the last network (at least one required)

**Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Network deleted successfully"
}
```

---

#### 13. Toggle Network Status
```http
PATCH /admin/crypto-coins/:coinId/networks/:networkId/toggle
```

**Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Network activated successfully"
}
```

**Use Case:** Temporarily disable a network without deleting it

---

## Network Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique network identifier |
| `name` | string | Yes | Display name (e.g., "BEP20 (BSC Mainnet)") |
| `network` | string | Yes | Network type reference |
| `isDefault` | boolean | No | Default network for this coin |
| `minDeposit` | string | Yes | Minimum deposit amount |
| `minimumWithdraw` | string | Yes | Minimum withdrawal amount |
| `withdrawFee` | string | Yes | Withdrawal fee |
| `fee` | string | Yes | General transaction fee |
| `requiresMemo` | boolean | No | Whether memo/tag is required |
| `memoLabel` | string | No | Label for memo field |
| `confirmations` | number | Yes | Required confirmations |
| `estimatedTime` | string | No | Estimated transaction time |
| `contactAddress` | string | No | Contract address (for tokens) |
| `rpcUrl` | string | Yes | RPC endpoint URL |
| `type` | string | No | Token type (Native, ERC20, BEP20, TRC20) |
| `isActive` | boolean | Yes | Network active status |

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation errors, missing fields)
- `404` - Not Found (coin or network not found)
- `500` - Internal Server Error

---

## Usage Examples

### Example 1: Get all active coins for user selection
```javascript
const response = await fetch('/crypto-coins/active/list');
const { data } = await response.json();
// Display coins to user
```

### Example 2: Add a new network to existing coin
```javascript
await fetch('/admin/crypto-coins/usdt/networks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'usdt-polygon-mainnet',
    name: 'Polygon (MATIC)',
    network: 'polygon-mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    minDeposit: '10',
    minimumWithdraw: '5',
    withdrawFee: '0.5',
    fee: '0.5',
    confirmations: 128,
    type: 'Polygon',
    isActive: true
  })
});
```

### Example 3: Temporarily disable a network
```javascript
await fetch('/admin/crypto-coins/usdt/networks/usdt-bep20-testnet/toggle', {
  method: 'PATCH'
});
```

---

## Best Practices

1. **Always validate network data** before adding/updating
2. **Use toggle endpoints** for status changes instead of full updates
3. **Check statistics endpoint** for overview before making bulk changes
4. **Keep at least one active network** per coin
5. **Use meaningful network IDs** (e.g., `{coin}-{network}-{environment}`)
6. **Set appropriate RPC URLs** for each network
7. **Configure realistic fees and limits** based on actual blockchain costs

---

## Migration Notes

If you have existing crypto coins data, the new default coins will only be inserted if the database is empty. To update existing coins:

1. Use the update endpoints to add missing fields
2. Add new networks using the network management endpoints
3. Verify all coins have required `rpcUrl` in their networks

---

## Testing

### Seed the database:
```bash
yarn seed:crypto
```

### Test endpoints:
```bash
# Get all coins
curl http://localhost:3000/crypto-coins

# Get statistics
curl http://localhost:3000/crypto-coins/stats/overview

# Get active coins
curl http://localhost:3000/crypto-coins/active/list
```

---

## Future Enhancements

- [ ] Bulk operations for coins and networks
- [ ] Network health monitoring
- [ ] Automatic RPC failover
- [ ] Historical fee tracking
- [ ] Network congestion detection
- [ ] Multi-language support for coin names
- [ ] Icon upload functionality
- [ ] Rate limiting for admin operations

---

**Last Updated:** 2026-01-14  
**Version:** 2.0.0
