import mongoose, { Schema, Document } from 'mongoose';

type CurrencyType = 'xp' | 'usdt';

export interface IConversionRate extends Document {
  from: CurrencyType;
  to: CurrencyType;
  rate: number;
  minAmount: number;
  maxAmount: number;
  fee: number; // Percentage fee (0-100)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionRateSchema = new Schema<IConversionRate>(
  {
    from: {
      type: String,
      required: [true, 'From currency is required'],
      enum: ['xp', 'usdt'],
      index: true,
    },
    to: {
      type: String,
      required: [true, 'To currency is required'],
      enum: ['xp', 'usdt'],
      index: true,
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    minAmount: {
      type: Number,
      default: 1,
      min: [0, 'Min amount cannot be negative'],
    },
    maxAmount: {
      type: Number,
      default: 1000000,
      min: [0, 'Max amount cannot be negative'],
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
      max: [100, 'Fee cannot exceed 100%'],
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

// Compound index for from-to pair
ConversionRateSchema.index({ from: 1, to: 1 }, { unique: true });

const ConversionRate = mongoose.model<IConversionRate>('ConversionRate', ConversionRateSchema);

export default ConversionRate;
