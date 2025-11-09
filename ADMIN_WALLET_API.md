# Admin Wallet API Documentation

Base URL: `/api/v1/admin-wallet`

## Public Endpoints (User-facing)

### 1. Get Deposit Address

Get deposit address for a specific coin and network.

**Endpoint:** `GET /deposit-address/:coinSymbol/:networkId`

**Parameters:**
- `coinSymbol` (path) - Coin symbol (e.g., USDT, BTC, ETH)
- `networkId` (path) - Network ID (e.g., trc20, erc20, bep20)

**Example Request:**
```bash
GET /api/v1/admin-wallet/deposit-address/USDT/trc20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coin": "USDT",
    "coinName": "Tether USD",
    "network": {
      "id": "trc20",
      "name": "TRC20",
      "minDeposit": "10",
      "confirmations": 19,
      "fee": "1",
      "requiresMemo": false
    },
    "depositAddress": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "memo": null
  },
  "message": "Deposit address retrieved successfully"
}
```

**Error Responses:**
- `404` - Coin not found or inactive
- `404` - Network not found or inactive
- `404` - Deposit address not configured
- `500` - Internal server error

---

### 2. Get All Deposit Info for a Coin

Get all deposit addresses for a coin across all networks.

**Endpoint:** `GET /deposit-info/:coinSymbol`

**Parameters:**
- `coinSymbol` (path) - Coin symbol (e.g., USDT, BTC)

**Example Request:**
```bash
GET /api/v1/admin-wallet/deposit-info/USDT
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coin": "USDT",
    "coinName": "Tether USD",
    "icon": "https://example.com/usdt.png",
    "networks": [
      {
        "id": "trc20",
        "name": "TRC20",
        "minDeposit": "10",
        "confirmations": 19,
        "fee": "1",
        "requiresMemo": false,
        "depositAddress": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "memo": null,
        "isConfigured": true
      },
      {
        "id": "erc20",
        "name": "ERC20",
        "minDeposit": "20",
        "confirmations": 12,
        "fee": "5",
        "requiresMemo": false,
        "depositAddress": "0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "memo": null,
        "isConfigured": true
      }
    ]
  },
  "message": "Deposit information retrieved successfully"
}
```

---

## Admin Endpoints

### 3. Create Admin Wallet

Create a new admin wallet with encrypted private key.

**Endpoint:** `POST /admin/create`

**Request Body:**
```json
{
  "coinId": "usdt",
  "coinSymbol": "USDT",
  "privateKey": "your-private-key-here",
  "depositAddresses": [
    {
      "networkId": "trc20",
      "networkName": "TRC20",
      "address": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    {
      "networkId": "erc20",
      "networkName": "ERC20",
      "address": "0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "coinId": "usdt",
    "coinSymbol": "USDT",
    "depositAddresses": [
      {
        "networkId": "trc20",
        "networkName": "TRC20",
        "address": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "createdAt": "2024-11-09T00:00:00.000Z"
      }
    ],
    "isActive": true
  },
  "message": "Admin wallet created successfully"
}
```

**Error Responses:**
- `400` - Missing required fields
- `400` - Invalid depositAddresses format
- `500` - Coin not found or other errors

---

### 4. Add/Update Deposit Address

Add a new deposit address or update an existing one for a network.

**Endpoint:** `PUT /admin/deposit-address`

**Request Body:**
```json
{
  "coinSymbol": "USDT",
  "networkId": "bep20",
  "address": "0xNewBEP20AddressHere",
  "memo": "optional-memo-for-networks-that-need-it"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coinSymbol": "USDT",
    "depositAddresses": [
      {
        "networkId": "trc20",
        "networkName": "TRC20",
        "address": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "createdAt": "2024-11-09T00:00:00.000Z"
      },
      {
        "networkId": "bep20",
        "networkName": "BEP20",
        "address": "0xNewBEP20AddressHere",
        "createdAt": "2024-11-09T00:00:00.000Z"
      }
    ]
  },
  "message": "Deposit address updated successfully"
}
```

---

### 5. Get All Admin Wallets

Get list of all admin wallets.

**Endpoint:** `GET /admin/list`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "coinId": "usdt",
      "coinSymbol": "USDT",
      "depositAddresses": [...],
      "isActive": true,
      "createdAt": "2024-11-09T00:00:00.000Z",
      "updatedAt": "2024-11-09T00:00:00.000Z"
    },
    {
      "coinId": "btc",
      "coinSymbol": "BTC",
      "depositAddresses": [...],
      "isActive": true,
      "createdAt": "2024-11-09T00:00:00.000Z",
      "updatedAt": "2024-11-09T00:00:00.000Z"
    }
  ],
  "message": "Admin wallets retrieved successfully"
}
```

---

### 6. Get Specific Admin Wallet

Get details of a specific admin wallet.

**Endpoint:** `GET /admin/:coinSymbol`

**Example Request:**
```bash
GET /api/v1/admin-wallet/admin/USDT
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coinId": "usdt",
    "coinSymbol": "USDT",
    "depositAddresses": [
      {
        "networkId": "trc20",
        "networkName": "TRC20",
        "address": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "createdAt": "2024-11-09T00:00:00.000Z"
      }
    ],
    "isActive": true,
    "createdAt": "2024-11-09T00:00:00.000Z",
    "updatedAt": "2024-11-09T00:00:00.000Z"
  },
  "message": "Admin wallet retrieved successfully"
}
```

---

### 7. Deactivate Admin Wallet

Deactivate an admin wallet (soft delete).

**Endpoint:** `DELETE /admin/:coinSymbol`

**Example Request:**
```bash
DELETE /api/v1/admin-wallet/admin/USDT
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Admin wallet deactivated successfully"
}
```

---

### 8. Decrypt Private Key (DANGEROUS)

Get decrypted private key. **Use with extreme caution!**

**Endpoint:** `POST /admin/decrypt-key`

**Request Body:**
```json
{
  "coinSymbol": "USDT",
  "confirmationCode": "your-admin-master-code"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coinSymbol": "USDT",
    "privateKey": "decrypted-private-key-here"
  },
  "message": "Private key decrypted successfully"
}
```

**Security Notes:**
- Requires `ADMIN_MASTER_CODE` environment variable
- All decryption attempts are logged
- Should be protected with additional authentication/2FA in production
- Only use when absolutely necessary (e.g., signing transactions)

---

## Usage Examples

### Frontend Integration - Show Deposit Address to User

```javascript
// When user wants to deposit USDT via TRC20
async function getDepositAddress(coinSymbol, networkId) {
  const response = await fetch(
    `/api/v1/admin-wallet/deposit-address/${coinSymbol}/${networkId}`
  );
  const data = await response.json();
  
  if (data.success) {
    // Show deposit address to user
    console.log('Deposit to:', data.data.depositAddress);
    console.log('Min deposit:', data.data.network.minDeposit);
    console.log('Confirmations needed:', data.data.network.confirmations);
    
    if (data.data.memo) {
      console.log('Memo/Tag:', data.data.memo);
    }
  }
}

// Usage
getDepositAddress('USDT', 'trc20');
```

### Admin Panel - Create New Wallet

```javascript
async function createAdminWallet() {
  const response = await fetch('/api/v1/admin-wallet/admin/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
    },
    body: JSON.stringify({
      coinId: 'usdt',
      coinSymbol: 'USDT',
      privateKey: 'your-private-key',
      depositAddresses: [
        {
          networkId: 'trc20',
          networkName: 'TRC20',
          address: 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        }
      ]
    })
  });
  
  const data = await response.json();
  console.log(data);
}
```

### Admin Panel - Add Network Address

```javascript
async function addNetworkAddress() {
  const response = await fetch('/api/v1/admin-wallet/admin/deposit-address', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
    },
    body: JSON.stringify({
      coinSymbol: 'USDT',
      networkId: 'bep20',
      address: '0xNewBEP20Address'
    })
  });
  
  const data = await response.json();
  console.log(data);
}
```

---

## Environment Variables Required

```env
# MongoDB connection
MONGO_URI=mongodb://localhost:27017/your-db

# Wallet encryption key (min 32 characters)
WALLET_ENCRYPTION_KEY=your-super-secret-encryption-key-min-32-chars

# Admin master code for private key decryption (optional but recommended)
ADMIN_MASTER_CODE=your-admin-master-code
```

---

## Security Recommendations

1. **Protect Admin Endpoints**: Add authentication middleware to all `/admin/*` routes
2. **Rate Limiting**: Implement rate limiting on all endpoints
3. **IP Whitelisting**: Restrict admin endpoints to specific IPs
4. **2FA**: Require two-factor authentication for private key decryption
5. **Audit Logging**: Log all admin actions, especially private key access
6. **HTTPS Only**: Never use these endpoints over HTTP in production
7. **Key Rotation**: Periodically rotate encryption keys and re-encrypt private keys

---

## Testing with cURL

```bash
# Get deposit address
curl http://localhost:5000/api/v1/admin-wallet/deposit-address/USDT/trc20

# Get all deposit info
curl http://localhost:5000/api/v1/admin-wallet/deposit-info/USDT

# Create admin wallet (admin)
curl -X POST http://localhost:5000/api/v1/admin-wallet/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "coinId": "usdt",
    "coinSymbol": "USDT",
    "privateKey": "test-key",
    "depositAddresses": [
      {
        "networkId": "trc20",
        "networkName": "TRC20",
        "address": "TXtest123"
      }
    ]
  }'

# Get all wallets (admin)
curl http://localhost:5000/api/v1/admin-wallet/admin/list
```
