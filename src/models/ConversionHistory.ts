import mongoose, { Schema, Document } from 'mongoose';

type CurrencyType = 'xp' | 'usdt';

export interface IConversionHistory extends Document {
  userId: number;
  fromCurrency: CurrencyType;
  toCurrency: CurrencyType;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionHistorySchema = new Schema<IConversionHistory>(
  {
    userId: {
      type: Number,
      required: [true, 'User ID is required'],
      index: true,
      ref: 'User',
    },
    fromCurrency: {
      type: String,
      required: [true, 'From currency is required'],
      enum: ['xp', 'usdt'],
    },
    toCurrency: {
      type: String,
      required: [true, 'To currency is required'],
      enum: ['xp', 'usdt'],
    },
    fromAmount: {
      type: Number,
      required: [true, 'From amount is required'],
      min: [0, 'From amount cannot be negative'],
    },
    toAmount: {
      type: Number,
      required: [true, 'To amount is required'],
      min: [0, 'To amount cannot be negative'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    transactionHash: {
      type: String,
      sparse: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
ConversionHistorySchema.index({ userId: 1, createdAt: -1 });
ConversionHistorySchema.index({ status: 1 });

const ConversionHistory = mongoose.model<IConversionHistory>('ConversionHistory', ConversionHistorySchema);

export default ConversionHistory;
