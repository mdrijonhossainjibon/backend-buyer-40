# Admin Wallet - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Set Environment Variables

Add to your `.env` file:

```env
WALLET_ENCRYPTION_KEY=my-super-secret-key-at-least-32-characters-long
ADMIN_MASTER_CODE=admin-master-code-for-decryption
```

### Step 2: Ensure CryptoCoin Exists

Make sure you have coins configured in the `CryptoCoin` collection:

```javascript
// Example: USDT with TRC20 and ERC20 networks
{
  id: "usdt",
  name: "Tether USD",
  symbol: "USDT",
  icon: "https://example.com/usdt.png",
  networks: [
    {
      id: "trc20",
      name: "TRC20",
      isDefault: true,
      minDeposit: "10",
      confirmations: 19,
      fee: "1",
      requiresMemo: false,
      isActive: true
    },
    {
      id: "erc20",
      name: "ERC20",
      isDefault: false,
      minDeposit: "20",
      confirmations: 12,
      fee: "5",
      requiresMemo: false,
      isActive: true
    }
  ],
  isActive: true,
  order: 1
}
```

### Step 3: Create Admin Wallet

**Option A: Using the Seed Script**

Edit `src/scripts/seedAdminWallet.ts` with your actual private keys and addresses, then run:

```bash
npx ts-node src/scripts/seedAdminWallet.ts
```

**Option B: Using the API**

```bash
curl -X POST http://localhost:5000/api/v1/admin-wallet/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "coinId": "usdt",
    "coinSymbol": "USDT",
    "privateKey": "YOUR_ACTUAL_PRIVATE_KEY",
    "depositAddresses": [
      {
        "networkId": "trc20",
        "networkName": "TRC20",
        "address": "YOUR_TRC20_ADDRESS"
      },
      {
        "networkId": "erc20",
        "networkName": "ERC20",
        "address": "YOUR_ERC20_ADDRESS"
      }
    ]
  }'
```

### Step 4: Test It

Get deposit address for users:

```bash
curl http://localhost:5000/api/v1/admin-wallet/deposit-address/USDT/trc20
```

---

## 📋 Available Endpoints

### Public (User-facing)
- `GET /api/v1/admin-wallet/deposit-address/:coinSymbol/:networkId` - Get deposit address
- `GET /api/v1/admin-wallet/deposit-info/:coinSymbol` - Get all networks info

### Admin Only
- `POST /api/v1/admin-wallet/admin/create` - Create wallet
- `PUT /api/v1/admin-wallet/admin/deposit-address` - Add/update address
- `GET /api/v1/admin-wallet/admin/list` - List all wallets
- `GET /api/v1/admin-wallet/admin/:coinSymbol` - Get specific wallet
- `DELETE /api/v1/admin-wallet/admin/:coinSymbol` - Deactivate wallet
- `POST /api/v1/admin-wallet/admin/decrypt-key` - Decrypt private key (DANGEROUS)

---

## 💡 Common Use Cases

### 1. Show Deposit Address to User

```typescript
import adminWalletService from './services/adminWalletService';

// In your deposit controller
const depositAddress = await adminWalletService.getDepositAddress('USDT', 'trc20');

// Show to user
res.json({
  address: depositAddress.address,
  memo: depositAddress.memo,
  network: depositAddress.networkName
});
```

### 2. Add New Network Address

```typescript
// Add BEP20 network to existing USDT wallet
await adminWalletService.addOrUpdateDepositAddress(
  'USDT',
  'bep20',
  '0xYourBEP20Address'
);
```

### 3. Get Private Key for Transaction Signing

```typescript
// Only when you need to sign a withdrawal transaction
const privateKey = await adminWalletService.getPrivateKey('USDT');
// Use privateKey to sign transaction
// NEVER log or expose this!
```

---

## 🔒 Security Checklist

- [ ] `WALLET_ENCRYPTION_KEY` is set and at least 32 characters
- [ ] `WALLET_ENCRYPTION_KEY` is NOT committed to git
- [ ] Admin endpoints are protected with authentication middleware
- [ ] Rate limiting is enabled on all endpoints
- [ ] Private key decryption is logged for audit
- [ ] HTTPS is enforced in production
- [ ] Admin access is restricted by IP (optional but recommended)

---

## 📁 File Structure

```
src/
├── models/
│   ├── AdminWallet.ts          # Main model with encryption
│   └── CryptoCoin.ts           # Coin and network definitions
├── services/
│   └── adminWalletService.ts   # Business logic layer
├── routes/
│   ├── admin-wallet/
│   │   └── route.ts            # API endpoints
│   └── v1/
│       └── index.ts            # Route registration
└── scripts/
    └── seedAdminWallet.ts      # Seed script

Documentation:
├── ADMIN_WALLET_USAGE.md       # Detailed usage guide
├── ADMIN_WALLET_API.md         # API documentation
└── ADMIN_WALLET_QUICK_START.md # This file
```

---

## 🐛 Troubleshooting

### Error: "WALLET_ENCRYPTION_KEY not set"
**Solution:** Add `WALLET_ENCRYPTION_KEY` to your `.env` file

### Error: "Coin with ID xxx not found"
**Solution:** Create the coin in `CryptoCoin` collection first

### Error: "Network xxx not found in coin"
**Solution:** Ensure the network exists in the coin's `networks` array

### Error: "Duplicate network IDs"
**Solution:** Each network ID must be unique within a wallet's deposit addresses

---

## 🎯 Next Steps

1. **Add Authentication**: Protect admin endpoints with JWT or session auth
2. **Add Rate Limiting**: Use `express-rate-limit` to prevent abuse
3. **Add Logging**: Implement comprehensive audit logging
4. **Add Monitoring**: Track deposit address usage and wallet health
5. **Add Webhooks**: Notify when deposits are detected on-chain

---

## 📞 Support

For detailed documentation, see:
- `ADMIN_WALLET_USAGE.md` - Complete usage examples
- `ADMIN_WALLET_API.md` - Full API reference

For questions or issues, check the code comments in:
- `src/models/AdminWallet.ts`
- `src/services/adminWalletService.ts`
- `src/routes/admin-wallet/route.ts`
