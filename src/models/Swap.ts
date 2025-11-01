import mongoose, { Schema, Document } from 'mongoose';

export interface ISwap extends Document {
  swapId: string;
  userId: number;
  fromToken: 'xp' | 'usdt' | 'spin';
  toToken: 'xp' | 'usdt' | 'spin';
  fromAmount: number;
  toAmount: number;
  exchangeRate: number; // Rate at the time of swap
  status: 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';
  txHash?: string; // Blockchain transaction hash (if applicable)
  errorMessage?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  requestedAt: Date;
  validatedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Function to generate unique swap ID
function generateSwapId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `SWAP_${timestamp}_${random}`.toUpperCase();
}

const SwapSchema = new Schema<ISwap>(
  {
    swapId: {
      type: String,
      required: true,
      unique: true,
      default: generateSwapId,
      index: true,
    },
    userId: {
      type: Number,
      required: [true, 'User ID is required'],
      index: true,
      ref: 'User',
    },
    fromToken: {
      type: String,
      required: [true, 'From token is required'],
      enum: ['xp', 'usdt', 'spin'],
      lowercase: true,
    },
    toToken: {
      type: String,
      required: [true, 'To token is required'],
      enum: ['xp', 'usdt', 'spin'],
      lowercase: true,
    },
    fromAmount: {
      type: Number,
      required: [true, 'From amount is required'],
      min: [0.000001, 'From amount must be greater than 0'],
    },
    toAmount: {
      type: Number,
      required: [true, 'To amount is required'],
      min: [0.000001, 'To amount must be greater than 0'],
    },
    exchangeRate: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'validating', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    txHash: {
      type: String,
      sparse: true,
    },
    errorMessage: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    validatedAt: {
      type: Date,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
SwapSchema.index({ userId: 1, status: 1 });
SwapSchema.index({ userId: 1, createdAt: -1 });
SwapSchema.index({ swapId: 1, userId: 1 });

// Validation: fromToken and toToken must be different
SwapSchema.pre('validate', function (next) {
  if (this.fromToken === this.toToken) {
    next(new Error('Cannot swap the same token'));
  } else {
    next();
  }
});

export default mongoose.models.Swap || mongoose.model<ISwap>('Swap', SwapSchema);
