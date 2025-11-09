# Admin Wallet Balance Management API

## Overview

Track and manage balances for admin wallets across different networks. Each admin wallet can have multiple network balances (e.g., USDT on TRC20, ERC20, BEP20).

---

## Balance Endpoints

### 1. Update Balance

Update the balance for a specific network.

**Endpoint:** `PUT /api/v1/admin-wallet/admin/balance`

**Request Body:**
```json
{
  "coinSymbol": "USDT",
  "networkId": "trc20-mainnet",
  "balance": 15000.50
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coinSymbol": "USDT",
    "balances": [
      {
        "networkId": "trc20-mainnet",
        "networkName": "TRC20 (TRON)",
        "balance": 15000.50,
        "lastUpdated": "2024-11-09T00:00:00.000Z"
      },
      {
        "networkId": "erc20-mainnet",
        "networkName": "ERC20 (Ethereum)",
        "balance": 8500.25,
        "lastUpdated": "2024-11-08T00:00:00.000Z"
      }
    ],
    "totalBalance": 23500.75
  },
  "message": "Balance updated successfully"
}
```

---

### 2. Get Balance for Specific Network

Get the current balance for a specific coin and network.

**Endpoint:** `GET /api/v1/admin-wallet/admin/balance/:coinSymbol/:networkId`

**Example:**
```bash
GET /api/v1/admin-wallet/admin/balance/USDT/trc20-mainnet
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coinSymbol": "USDT",
    "networkId": "trc20-mainnet",
    "balance": 15000.50
  },
  "message": "Balance retrieved successfully"
}
```

---

### 3. Get All Balances for a Coin

Get balances across all networks for a specific coin.

**Endpoint:** `GET /api/v1/admin-wallet/admin/balances/:coinSymbol`

**Example:**
```bash
GET /api/v1/admin-wallet/admin/balances/USDT
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coinSymbol": "USDT",
    "balances": [
      {
        "networkId": "trc20-mainnet",
        "networkName": "TRC20 (TRON)",
        "balance": 15000.50,
        "lastUpdated": "2024-11-09T00:00:00.000Z"
      },
      {
        "networkId": "erc20-mainnet",
        "networkName": "ERC20 (Ethereum)",
        "balance": 8500.25,
        "lastUpdated": "2024-11-08T00:00:00.000Z"
      },
      {
        "networkId": "bep20-mainnet",
        "networkName": "BEP20 (BSC Mainnet)",
        "balance": 12000.00,
        "lastUpdated": "2024-11-09T00:00:00.000Z"
      }
    ],
    "totalBalance": 35500.75
  },
  "message": "Balances retrieved successfully"
}
```

---

### 4. Get All Balances (All Coins & Networks)

Get a complete overview of all admin wallet balances across all coins and networks.

**Endpoint:** `GET /api/v1/admin-wallet/admin/all-balances`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalBalanceAllCoins": 59001.00,
    "wallets": [
      {
        "coinSymbol": "USDT",
        "coinId": "usdt",
        "totalBalance": 35500.75,
        "networks": [
          {
            "networkId": "trc20-mainnet",
            "networkName": "TRC20 (TRON)",
            "balance": 15000.50,
            "lastUpdated": "2024-11-09T00:00:00.000Z"
          },
          {
            "networkId": "erc20-mainnet",
            "networkName": "ERC20 (Ethereum)",
            "balance": 8500.25,
            "lastUpdated": "2024-11-08T00:00:00.000Z"
          },
          {
            "networkId": "bep20-mainnet",
            "networkName": "BEP20 (BSC Mainnet)",
            "balance": 12000.00,
            "lastUpdated": "2024-11-09T00:00:00.000Z"
          }
        ]
      },
      {
        "coinSymbol": "BTC",
        "coinId": "btc",
        "totalBalance": 23500.25,
        "networks": [
          {
            "networkId": "bitcoin-mainnet",
            "networkName": "Bitcoin",
            "balance": 23500.25,
            "lastUpdated": "2024-11-09T00:00:00.000Z"
          }
        ]
      }
    ]
  },
  "message": "All balances retrieved successfully"
}
```

**Example Request:**
```bash
curl http://localhost:5000/api/v1/admin-wallet/admin/all-balances
```

---

## Usage Examples

### Update Balance via Service

```typescript
import adminWalletService from './services/adminWalletService';

// Update USDT balance on TRC20 network
const wallet = await adminWalletService.updateBalance(
  'USDT',
  'trc20-mainnet',
  15000.50
);

console.log('Total balance:', wallet.totalBalance);
console.log('Network balances:', wallet.balances);
```

### Get Balance via Service

```typescript
import adminWalletService from './services/adminWalletService';

// Get current balance
const balance = await adminWalletService.getBalance(
  'USDT',
  'trc20-mainnet'
);

console.log('Current balance:', balance);
```

### Update Balance via API (cURL)

```bash
# Update balance
curl -X PUT http://localhost:5000/api/v1/admin-wallet/admin/balance \
  -H "Content-Type: application/json" \
  -d '{
    "coinSymbol": "USDT",
    "networkId": "trc20-mainnet",
    "balance": 15000.50
  }'

# Get specific network balance
curl http://localhost:5000/api/v1/admin-wallet/admin/balance/USDT/trc20-mainnet

# Get all balances for a coin
curl http://localhost:5000/api/v1/admin-wallet/admin/balances/USDT

# Get all balances across all coins and networks
curl http://localhost:5000/api/v1/admin-wallet/admin/all-balances
```

---

## Integration Examples

### Track Deposits

When a user deposits crypto, update the admin wallet balance:

```typescript
import adminWalletService from './services/adminWalletService';

async function handleDeposit(userId: number, coinSymbol: string, networkId: string, amount: number) {
  try {
    // Get current balance
    const currentBalance = await adminWalletService.getBalance(coinSymbol, networkId);
    
    // Add deposit amount
    const newBalance = (currentBalance || 0) + amount;
    
    // Update balance
    await adminWalletService.updateBalance(coinSymbol, networkId, newBalance);
    
    console.log(`✅ Deposit processed: ${amount} ${coinSymbol} on ${networkId}`);
    console.log(`New balance: ${newBalance}`);
  } catch (error) {
    console.error('❌ Error processing deposit:', error);
  }
}
```

### Track Withdrawals

When processing a withdrawal, deduct from the admin wallet balance:

```typescript
import adminWalletService from './services/adminWalletService';

async function handleWithdrawal(userId: number, coinSymbol: string, networkId: string, amount: number) {
  try {
    // Get current balance
    const currentBalance = await adminWalletService.getBalance(coinSymbol, networkId);
    
    if (!currentBalance || currentBalance < amount) {
      throw new Error('Insufficient admin wallet balance');
    }
    
    // Deduct withdrawal amount
    const newBalance = currentBalance - amount;
    
    // Update balance
    await adminWalletService.updateBalance(coinSymbol, networkId, newBalance);
    
    console.log(`✅ Withdrawal processed: ${amount} ${coinSymbol} on ${networkId}`);
    console.log(`Remaining balance: ${newBalance}`);
  } catch (error) {
    console.error('❌ Error processing withdrawal:', error);
  }
}
```

### Dashboard Display

Show admin wallet balances in admin dashboard:

```typescript
import adminWalletService from './services/adminWalletService';

async function getAdminDashboardData() {
  // Get all balances across all coins and networks
  const balancesData = await adminWalletService.getAllBalances();
  
  console.log('Total balance (all coins):', balancesData.totalBalanceAllCoins);
  
  balancesData.wallets.forEach(wallet => {
    console.log(`\n${wallet.coinSymbol} - Total: ${wallet.totalBalance}`);
    wallet.networks.forEach(network => {
      console.log(`  ${network.networkName}: ${network.balance}`);
    });
  });
  
  return balancesData;
}
```

### Get All Balances Summary

```typescript
import adminWalletService from './services/adminWalletService';

async function getBalancesSummary() {
  const data = await adminWalletService.getAllBalances();
  
  return {
    totalValue: data.totalBalanceAllCoins,
    breakdown: data.wallets.map(w => ({
      coin: w.coinSymbol,
      total: w.totalBalance,
      networks: w.networks.length
    }))
  };
}
```

---

## Database Schema

### AdminWallet with Balances

```javascript
{
  _id: ObjectId,
  coinId: "usdt",
  coinSymbol: "USDT",
  encryptedPrivateKey: "...",
  depositAddresses: [...],
  balances: [
    {
      networkId: "trc20-mainnet",
      networkName: "TRC20 (TRON)",
      balance: 15000.50,
      lastUpdated: Date
    },
    {
      networkId: "erc20-mainnet",
      networkName: "ERC20 (Ethereum)",
      balance: 8500.25,
      lastUpdated: Date
    }
  ],
  totalBalance: 23500.75,  // Auto-calculated
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Features

✅ **Per-Network Tracking** - Track balance separately for each network
✅ **Auto-Calculation** - Total balance automatically calculated
✅ **Timestamp Tracking** - Last update time for each network
✅ **Validation** - Prevents negative balances
✅ **Auto-Creation** - Creates balance entry if it doesn't exist

---

## Best Practices

1. **Update on Every Transaction**
   - Increment on deposits
   - Decrement on withdrawals
   - Keep balances synchronized with blockchain

2. **Regular Reconciliation**
   - Periodically verify balances against blockchain
   - Set up automated balance checks
   - Alert on discrepancies

3. **Monitoring**
   - Track balance changes over time
   - Set up alerts for low balances
   - Monitor unusual balance fluctuations

4. **Security**
   - Protect balance update endpoints with authentication
   - Log all balance changes for audit
   - Implement rate limiting

---

## Error Handling

```typescript
try {
  await adminWalletService.updateBalance('USDT', 'trc20-mainnet', 15000);
} catch (error) {
  if (error.message.includes('not found')) {
    // Admin wallet doesn't exist
    console.error('Create admin wallet first');
  } else if (error.message.includes('negative')) {
    // Attempted to set negative balance
    console.error('Balance cannot be negative');
  } else {
    // Other errors
    console.error('Error updating balance:', error);
  }
}
```

---

## Complete API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/admin/balance` | Update balance for a network |
| GET | `/admin/balance/:coin/:network` | Get balance for specific network |
| GET | `/admin/balances/:coin` | Get all balances for a coin |

All endpoints are under `/api/v1/admin-wallet/`
