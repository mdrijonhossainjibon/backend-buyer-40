# Admin Wallet Structure - Mnemonic-Based Multi-Network Support

## Overview

The AdminWallet model now uses a **single mnemonic phrase** to manage wallets across multiple blockchain networks. This allows one wallet to have different addresses for different networks (ETH, BSC, TRX, etc.) all derived from the same mnemonic.

## Architecture

### One Mnemonic, Multiple Networks

```
Mnemonic (12/24 words)
    ├── ETH Network → Address A + Private Key A
    ├── BSC Network → Address B + Private Key B  
    ├── TRX Network → Address C + Private Key C
    └── SOL Network → Address D + Private Key D
```

## Model Structure

### AdminWallet Schema

```typescript
{
  coinId: string;           // Reference to CryptoCoin
  symbol: string;           // e.g., 'USDT', 'BTC'
  mnemonic: string;         // Single mnemonic for all networks (encrypted, not returned by default)
  depositAddresses: [{
    networkId: string;      // e.g., 'bep20-mainnet', 'erc20-mainnet'
    networkName: string;    // e.g., 'BEP20 (BSC Mainnet)'
    address: string;        // Network-specific address
    privateKey: string;     // Network-specific private key (not returned by default)
    memo?: string;          // For networks requiring memo (XRP, XLM)
    createdAt: Date;
  }];
  balance: number;          // Total balance across all networks
  lastBalanceUpdate: Date;
  isActive: boolean;
}
```

## Key Features

### 1. Security
- **Mnemonic**: Stored securely, not returned in API responses by default (`select: false`)
- **Private Keys**: Each network's private key is stored separately, also protected
- **Encryption**: Mnemonic should be encrypted at rest (implement encryption layer)

### 2. Multi-Network Support
- One mnemonic generates different addresses for different blockchains
- Each network has its own address and private key
- Same mnemonic can be used to restore all network wallets

### 3. Flexibility
- Add new networks to existing wallet without changing mnemonic
- Each network can have different addresses derived from the same seed
- Support for memo-based networks (XRP, XLM, etc.)

## Usage Examples

### Creating a Wallet

```typescript
import { generateHotWallet } from 'auth-fingerprint';

const hotWallet = generateHotWallet();

const wallet = await adminWalletService.createAdminWallet(
  coinId,
  'USDT',
  hotWallet.mnemonic.phrase, // One mnemonic for all networks
  [
    {
      networkId: 'bep20-mainnet',
      networkName: 'BEP20 (BSC Mainnet)',
      address: hotWallet.address,
      privateKey: hotWallet.privateKey,
    },
    {
      networkId: 'erc20-mainnet',
      networkName: 'ERC20 (Ethereum)',
      address: hotWallet.address, // Can be same or different
      privateKey: hotWallet.privateKey,
    },
  ]
);
```

### Adding a Network to Existing Wallet

```typescript
await adminWalletService.addOrUpdateDepositAddress(
  'USDT',
  'trc20-mainnet',
  'TRonAddressHere',
  'privateKeyForTron',
  undefined // memo (optional)
);
```

### Getting Deposit Address

```typescript
const depositAddress = await adminWalletService.getDepositAddress(
  'USDT',
  'bep20-mainnet'
);

// Returns: { networkId, networkName, address, memo, createdAt }
// Note: privateKey is NOT returned for security
```

## API Endpoints

### Public Endpoints

- `GET /api/v1/admin-wallet/deposit-address/:symbol/:networkId`
  - Get deposit address for a specific coin and network
  - Returns address without private key

- `GET /api/v1/admin-wallet/deposit-info/:symbol`
  - Get all deposit addresses for a coin (all networks)

### Admin Endpoints

- `POST /api/v1/admin-wallet/admin/create`
  - Create new admin wallet with mnemonic
  - Body: `{ coinId, symbol, mnemonic, depositAddresses }`

- `PUT /api/v1/admin-wallet/admin/deposit-address`
  - Add or update deposit address for a network
  - Body: `{ symbol, networkId, address, privateKey, memo? }`

- `GET /api/v1/admin-wallet/admin/list`
  - Get all admin wallets

- `GET /api/v1/admin-wallet/admin/:symbol`
  - Get specific admin wallet details

- `DELETE /api/v1/admin-wallet/admin/:symbol`
  - Deactivate an admin wallet

- `PUT /api/v1/admin-wallet/admin/balance`
  - Update balance for a coin
  - Body: `{ symbol, balance }`

- `GET /api/v1/admin-wallet/admin/balance/:symbol`
  - Get balance for a coin

- `GET /api/v1/admin-wallet/admin/all-balances`
  - Get all balances across all coins

## Best Practices

### 1. Mnemonic Management
- **Never** expose the mnemonic in API responses
- Store mnemonic encrypted in the database
- Backup mnemonic securely offline
- Use hardware security modules (HSM) in production

### 2. Network-Specific Keys
- Each network should have its own derived address
- For EVM-compatible chains (ETH, BSC, Polygon), the same address/key can work
- For different blockchain types (TRX, SOL, BTC), derive different addresses from mnemonic

### 3. Balance Management
- Track total balance across all networks
- Update balance regularly via blockchain queries
- Consider implementing real-time balance sync

### 4. Security Considerations
- Implement rate limiting on admin endpoints
- Require 2FA for sensitive operations
- Log all wallet operations for audit trail
- Never log private keys or mnemonics
- Use HTTPS only in production

## Migration Notes

If migrating from the old structure:

1. **Old**: Each wallet had `encryptedPrivateKey`, `publicKey`, `address`
2. **New**: Each wallet has `mnemonic` with multiple `depositAddresses`

Migration steps:
1. Generate mnemonic for existing wallets
2. Derive network-specific addresses from mnemonic
3. Store private keys per network in `depositAddresses`
4. Remove old `encryptedPrivateKey`, `publicKey`, `address` fields

## Future Enhancements

- [ ] Implement mnemonic encryption at rest
- [ ] Add support for HD wallet derivation paths
- [ ] Implement automatic address derivation for new networks
- [ ] Add balance sync service for real-time updates
- [ ] Implement multi-signature support
- [ ] Add webhook notifications for deposits
- [ ] Implement transaction history tracking
