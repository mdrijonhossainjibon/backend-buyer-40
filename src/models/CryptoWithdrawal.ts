import mongoose, { Schema, Document } from 'mongoose';

export interface ICryptoWithdrawal extends Document {
  withdrawalId: string;
  userId: string;
  coinId: string;
  coinSymbol: string;
  network: string;
  networkName: string;
  address: string;
  memo?: string;
  amount: number;
  fee: number;
  netAmount: number; // amount - fee
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  errorMessage?: string;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    estimatedTime?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Function to generate unique withdrawal ID
function generateCryptoWithdrawalId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `WD${timestamp}${random}`.toUpperCase();
}

const CryptoWithdrawalSchema = new Schema<ICryptoWithdrawal>(
  {
    withdrawalId: {
      type: String,
      unique: true,
      required: true,
      default: generateCryptoWithdrawalId,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    coinId: {
      type: String,
      required: true,
      index: true,
    },
    coinSymbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    network: {
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
      trim: true,
    },
    memo: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    transactionHash: {
      type: String,
      trim: true,
      index: true,
    },
    confirmations: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredConfirmations: {
      type: Number,
      default: 15,
      min: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
      index: true,
    },
    completedAt: {
      type: Date,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'crypto_withdrawals',
  }
);

// Indexes for better query performance
CryptoWithdrawalSchema.index({ userId: 1, status: 1 });
CryptoWithdrawalSchema.index({ coinSymbol: 1, status: 1 });
CryptoWithdrawalSchema.index({ requestedAt: -1 });

const CryptoWithdrawal =
  mongoose.models.CryptoWithdrawal ||
  mongoose.model<ICryptoWithdrawal>('CryptoWithdrawal', CryptoWithdrawalSchema);

export default CryptoWithdrawal;
