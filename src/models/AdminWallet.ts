import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * Interface for deposit address per network
 */
export interface IDepositAddress {
  networkId: string;
  networkName: string;
  address: string;
  memo?: string; // For networks that require memo (like XRP, XLM)
  createdAt: Date;
}

/**
 * Admin Wallet Interface
 * Stores encrypted private keys and manages deposit addresses for different networks
 */
export interface IAdminWallet extends Document {
  coinId: string; // Reference to CryptoCoin.id
  coinSymbol: string; // e.g., 'USDT', 'BTC', 'ETH'
  encryptedPrivateKey: string; // Encrypted private key
  depositAddresses: IDepositAddress[]; // Deposit addresses for different networks
  balance: number; // Single balance for the coin (shared across all networks)
  lastBalanceUpdate: Date; // Last time balance was updated
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  decryptPrivateKey(encryptionKey: string): string;
  getDepositAddress(networkId: string): IDepositAddress | null;
}

/**
 * Deposit Address Schema
 */
const DepositAddressSchema = new Schema<IDepositAddress>({
  networkId: {
    type: String,
    required: true,
  },
  networkName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  memo: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Admin Wallet Schema
 */
const AdminWalletSchema = new Schema<IAdminWallet>(
  {
    coinId: {
      type: String,
      required: [true, 'Coin ID is required'],
      ref: 'CryptoCoin',
      index: true,
    },
    coinSymbol: {
      type: String,
      required: [true, 'Coin symbol is required'],
      uppercase: true,
      index: true,
    },
    encryptedPrivateKey: {
      type: String,
      required: [true, 'Encrypted private key is required'],
      select: false, // Don't return by default for security
    },
    depositAddresses: [DepositAddressSchema],
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastBalanceUpdate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique coin per symbol
AdminWalletSchema.index({ coinId: 1, coinSymbol: 1 }, { unique: true });

/**
 * Static method to encrypt private key
 * @param privateKey - Plain text private key
 * @param encryptionKey - Encryption key (should be stored in env variables)
 * @returns Encrypted private key
 */
AdminWalletSchema.statics.encryptPrivateKey = function (
  privateKey: string,
  encryptionKey: string
): string {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(64);
  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha512');

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine salt, iv, authTag, and encrypted data
  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
};

/**
 * Instance method to decrypt private key
 * @param encryptionKey - Encryption key (should be stored in env variables)
 * @returns Decrypted private key
 */
AdminWalletSchema.methods.decryptPrivateKey = function (
  encryptionKey: string
): string {
  const algorithm = 'aes-256-gcm';
  const data = Buffer.from(this.encryptedPrivateKey, 'base64');

  // Extract components
  const salt = data.subarray(0, 64);
  const iv = data.subarray(64, 80);
  const authTag = data.subarray(80, 96);
  const encrypted = data.subarray(96);

  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha512');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

/**
 * Instance method to get deposit address for a specific network
 * @param networkId - Network ID from CryptoCoin.networks
 * @returns Deposit address object or null
 */
AdminWalletSchema.methods.getDepositAddress = function (
  networkId: string
): IDepositAddress | null {
  const depositAddress = this.depositAddresses.find(
    (addr: IDepositAddress) => addr.networkId === networkId
  );
  return depositAddress || null;
};

/**
 * Pre-save hook to validate deposit addresses and update lastBalanceUpdate
 */
AdminWalletSchema.pre('save', async function (next) {
  if (this.isModified('depositAddresses')) {
    // Ensure no duplicate network IDs
    const networkIds = this.depositAddresses.map((addr) => addr.networkId);
    const uniqueNetworkIds = new Set(networkIds);
    
    if (networkIds.length !== uniqueNetworkIds.size) {
      throw new Error('Duplicate network IDs in deposit addresses');
    }
  }
  
  // Update lastBalanceUpdate when balance changes
  if (this.isModified('balance')) {
    this.lastBalanceUpdate = new Date();
  }
  
  next();
});

const AdminWallet = mongoose.model<IAdminWallet>('AdminWallet', AdminWalletSchema);

export default AdminWallet;
