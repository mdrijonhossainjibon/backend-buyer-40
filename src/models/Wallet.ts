import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: number;
  balances: {
    xp: number;      // Experience Points
    usdt: number;    // USDT stablecoin
    spin: number;    // Spin tokens for wheel
  };
  locked: {
    xp: number;      // Locked XP (pending swaps/withdrawals)
    usdt: number;    // Locked USDT
    spin: number;    // Locked SPIN
  };
  totalEarned: {
    xp: number;
    usdt: number;
    spin: number;
  };
  totalSpent: {
    xp: number;
    usdt: number;
    spin: number;
  };
  lastTransaction?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Number,
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
      ref: 'User',
    },
    balances: {
      xp: {
        type: Number,
        default: 0,
        min: [0, 'XP balance cannot be negative'],
      },
      usdt: {
        type: Number,
        default: 0,
        min: [0, 'USDT balance cannot be negative'],
      },
      spin: {
        type: Number,
        default: 0,
        min: [0, 'SPIN balance cannot be negative'],
      },
    },
    locked: {
      xp: {
        type: Number,
        default: 0,
        min: [0, 'Locked XP cannot be negative'],
      },
      usdt: {
        type: Number,
        default: 0,
        min: [0, 'Locked USDT cannot be negative'],
      },
      spin: {
        type: Number,
        default: 0,
        min: [0, 'Locked SPIN cannot be negative'],
      },
    },
    totalEarned: {
      xp: {
        type: Number,
        default: 0,
        min: [0, 'Total earned XP cannot be negative'],
      },
      usdt: {
        type: Number,
        default: 0,
        min: [0, 'Total earned USDT cannot be negative'],
      },
      spin: {
        type: Number,
        default: 0,
        min: [0, 'Total earned SPIN cannot be negative'],
      },
    },
    totalSpent: {
      xp: {
        type: Number,
        default: 0,
        min: [0, 'Total spent XP cannot be negative'],
      },
      usdt: {
        type: Number,
        default: 0,
        min: [0, 'Total spent USDT cannot be negative'],
      },
      spin: {
        type: Number,
        default: 0,
        min: [0, 'Total spent SPIN cannot be negative'],
      },
    },
    lastTransaction: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries
WalletSchema.index({ userId: 1 });

// Virtual for available balances (balance - locked)
WalletSchema.virtual('available').get(function () {
  return {
    xp: this.balances.xp - this.locked.xp,
    usdt: this.balances.usdt - this.locked.usdt,
    spin: this.balances.spin - this.locked.spin,
  };
});

const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
export default Wallet;
