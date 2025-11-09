# Admin Wallet Usage Guide

## Overview

The `AdminWallet` model securely stores private keys (encrypted) and manages deposit addresses for different cryptocurrency networks based on the `CryptoCoin` model.

## Environment Setup

Add this to your `.env` file:

```env
WALLET_ENCRYPTION_KEY=your-super-secret-encryption-key-min-32-chars
```

**Important:** Keep this key secure and never commit it to version control!

## Usage Examples

### 1. Create an Admin Wallet

```typescript
import adminWalletService from './services/adminWalletService';

// Example: Create USDT admin wallet with TRC20 and ERC20 addresses
const usdtWallet = await adminWalletService.createAdminWallet(
  'usdt', // coinId from CryptoCoin
  'USDT', // coinSymbol
  'your-private-key-here', // This will be encrypted
  [
    {
      networkId: 'trc20',
      networkName: 'TRC20',
      address: 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      networkId: 'erc20',
      networkName: 'ERC20',
      address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  ]
);
```

### 2. Get Deposit Address for User Deposits

```typescript
import adminWalletService from './services/adminWalletService';

// Get USDT deposit address on TRC20 network
const depositAddress = await adminWalletService.getDepositAddress(
  'USDT',
  'trc20'
);

if (depositAddress) {
  console.log('Deposit to:', depositAddress.address);
  if (depositAddress.memo) {
    console.log('Memo:', depositAddress.memo);
  }
}
```

### 3. Add or Update Deposit Address

```typescript
import adminWalletService from './services/adminWalletService';

// Add a new network address or update existing one
await adminWalletService.addOrUpdateDepositAddress(
  'USDT',
  'bep20',
  '0xNewBEP20AddressHere'
);
```

### 4. Get Private Key (Use with Caution!)

```typescript
import adminWalletService from './services/adminWalletService';

// Only use this when you need to sign transactions
const privateKey = await adminWalletService.getPrivateKey('USDT');
// Use privateKey for signing transactions
```

### 5. Get All Admin Wallets

```typescript
import adminWalletService from './services/adminWalletService';

const wallets = await adminWalletService.getAllAdminWallets();
wallets.forEach((wallet) => {
  console.log(`${wallet.coinSymbol}:`, wallet.depositAddresses);
});
```

### 6. Integration with CryptoCoin

```typescript
import CryptoCoin from './models/CryptoCoin';
import adminWalletService from './services/adminWalletService';

// Get coin and its networks
const coin = await CryptoCoin.findOne({ symbol: 'USDT' });

if (coin) {
  // For each active network, get the deposit address
  for (const network of coin.networks) {
    if (network.isActive) {
      const depositAddr = await adminWalletService.getDepositAddress(
        coin.symbol,
        network.id
      );
      
      console.log(`${network.name}:`, depositAddr?.address);
    }
  }
}
```

## API Route Example

```typescript
import { Router } from 'express';
import adminWalletService from '../services/adminWalletService';
import CryptoCoin from '../models/CryptoCoin';

const router = Router();

// Get deposit address for a coin and network
router.get('/deposit-address/:coinSymbol/:networkId', async (req, res) => {
  try {
    const { coinSymbol, networkId } = req.params;
    
    // Verify coin and network exist
    const coin = await CryptoCoin.findOne({ 
      symbol: coinSymbol.toUpperCase() 
    });
    
    if (!coin) {
      return res.status(404).json({ 
        success: false, 
        error: 'Coin not found' 
      });
    }
    
    const network = coin.networks.find(n => n.id === networkId);
    if (!network || !network.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Network not found or inactive' 
      });
    }
    
    // Get deposit address
    const depositAddress = await adminWalletService.getDepositAddress(
      coinSymbol,
      networkId
    );
    
    if (!depositAddress) {
      return res.status(404).json({ 
        success: false, 
        error: 'Deposit address not configured' 
      });
    }
    
    res.json({
      success: true,
      data: {
        coin: coinSymbol.toUpperCase(),
        network: network.name,
        address: depositAddress.address,
        memo: depositAddress.memo,
        minDeposit: network.minDeposit,
        confirmations: network.confirmations,
        fee: network.fee,
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
```

## Security Best Practices

1. **Never log private keys** - Only decrypt when absolutely necessary
2. **Use environment variables** - Store `WALLET_ENCRYPTION_KEY` securely
3. **Limit access** - Only admin routes should access private keys
4. **Rotate keys** - Periodically update encryption keys and re-encrypt
5. **Audit access** - Log all private key decryption attempts

## Database Schema

### AdminWallet Collection

```javascript
{
  _id: ObjectId,
  coinId: "usdt",              // Reference to CryptoCoin.id
  coinSymbol: "USDT",          // Uppercase symbol
  encryptedPrivateKey: "...",  // AES-256-GCM encrypted
  depositAddresses: [
    {
      networkId: "trc20",
      networkName: "TRC20",
      address: "TXxxx...",
      memo: null,              // Optional
      createdAt: Date
    }
  ],
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

```typescript
// Test encryption/decryption
import AdminWallet from './models/AdminWallet';

const testKey = 'test-encryption-key-must-be-32-chars-min';
const privateKey = 'my-secret-private-key';

// Encrypt
const encrypted = (AdminWallet as any).encryptPrivateKey(
  privateKey, 
  testKey
);

// Create wallet and decrypt
const wallet = await AdminWallet.create({
  coinId: 'test',
  coinSymbol: 'TEST',
  encryptedPrivateKey: encrypted,
  depositAddresses: [],
});

const decrypted = wallet.decryptPrivateKey(testKey);
console.log(decrypted === privateKey); // Should be true
```
