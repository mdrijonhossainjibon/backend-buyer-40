import mongoose, { Schema, Document } from 'mongoose';

export interface INetwork {
  id: string;
  name: string;
  isDefault: boolean;
  minDeposit: string;
  confirmations: number;
  fee: string;
  requiresMemo?: boolean;
  isActive: boolean;
}

export interface ICryptoCoin extends Document {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  networks: INetwork[];
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const NetworkSchema = new Schema<INetwork>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  minDeposit: {
    type: String,
    required: true
  },
  confirmations: {
    type: Number,
    required: true
  },
  fee: {
    type: String,
    required: true
  },
  requiresMemo: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const CryptoCoinSchema = new Schema<ICryptoCoin>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  icon: {
    type: String,
    required: true
  },
  networks: [NetworkSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
CryptoCoinSchema.index({ isActive: 1, order: 1 });

const CryptoCoin = mongoose.model<ICryptoCoin>('CryptoCoin', CryptoCoinSchema);

export default CryptoCoin;
