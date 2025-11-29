import mongoose, { Schema, Document } from 'mongoose';

/**
 * Wallets Interface
 * Multi-network wallet with balance per symbol and network
 */
export interface IWallets extends Document {
  symbol: string;           // e.g., 'USDT', 'ETH', 'BNB', 'TRX'
  supportedNetworks: string[]; // e.g., ['ETH', 'BSC', 'TRX', 'POLYGON']
  balance: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const WalletsSchema = new Schema<IWallets>(
  {
    symbol: {
      type: String,
      required: [true, 'Symbol is required'],
      uppercase: true,
      unique: true,
    },
    supportedNetworks: {
      type: [String],
      default: [],
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    status: {    
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
 

const Wallets = mongoose.model<IWallets>('Wallets-Hot', WalletsSchema);
export default Wallets;
