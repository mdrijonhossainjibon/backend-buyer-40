import mongoose, { Schema, Document } from 'mongoose';

/**
 * Admin Wallet (Hot Wallet) Interface
 * Simple wallet with mnemonic, address, status, and supported networks
 */
export interface IAdminWallet extends Document {
  mnemonic: string;
  privateKey: string;
  address: string;
  status: 'active' | 'inactive' | 'suspended';
  supportedNetworks: string[]; // e.g., ['ETH', 'BSC', 'TRX', 'POLYGON']
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Admin Wallet Schema
 */
const AdminWalletSchema = new Schema<IAdminWallet>(
  {
    mnemonic: {
      type: String,
      required: [true, 'Mnemonic is required'],
      select: false, // Don't return by default for security
    },
    privateKey: {
      type: String,
      required: [true, 'Private key is required'],
      select: false, // Don't return by default for security
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    supportedNetworks: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

 
const AdminWallet = mongoose.model<IAdminWallet>('AdminWallet', AdminWalletSchema);

export default AdminWallet;
