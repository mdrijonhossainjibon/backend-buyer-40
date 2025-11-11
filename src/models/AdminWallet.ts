import mongoose, { Schema, Document } from 'mongoose';
 
/**
 * Interface for deposit address per network
 */
export interface IDepositAddress {
  networkId: string;
  networkName: string;
  address: string; // Network-specific address derived from mnemonic
  privateKey: string; // Network-specific private key derived from mnemonic
  memo?: string; // For networks that require memo (like XRP, XLM)
  createdAt: Date;
}

/**
 * Admin Wallet Interface
 * Stores one mnemonic and generates different addresses for different networks
 */
export interface IAdminWallet extends Document {
  coinId: string; // Reference to CryptoCoin.id
  symbol: string; // e.g., 'USDT', 'BTC', 'ETH'
  mnemonic: string; // Single mnemonic phrase for all networks
  depositAddresses: IDepositAddress[]; // Different addresses per network (ETH, BSC, TRX, etc.)
  balance: number; // Single balance for the coin (shared across all networks)
  lastBalanceUpdate: Date; // Last time balance was updated
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  privateKey: {
    type: String,
    required: true,
    select: false, // Don't return by default for security
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
    symbol: {
      type: String,
      required: [true, 'Coin symbol is required'],
      uppercase: true,
      index: true,
    },
    mnemonic: {
      type: String,
      required: [true, 'Mnemonic is required'],
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

 
const AdminWallet = mongoose.model<IAdminWallet>('AdminWallet', AdminWalletSchema);

export default AdminWallet;
