import mongoose, { Schema, Document } from 'mongoose';

export interface INetwork {
  id: string;
  name: string;
  type?: string;           // e.g., 'Native', 'ERC-20', 'BEP-20', 'TRC-20'
  isDefault: boolean;
  minDeposit: string;
  minimumWithdraw: string;
  confirmations: number;
  estimatedTime?: string;  // e.g., '~5 min'
  fee: string;
  withdrawFee: string;
  requiresMemo?: boolean;
  memo?: string;           // memo/tag for networks that require it
  isActive: boolean;
  contactAddress: string;
  rpcUrl: string;
}

export interface ICryptoCoin extends Document {
  id: string;
  name: string;
  symbol: string;  
  icon: string;
  networks: INetwork[];
  isActive: boolean;
  isNativeCoin?: boolean;
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
  type: {
    type: String,
    default: 'Native'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  minDeposit: {
    type: String,
    required: true
  },
  minimumWithdraw: {
    type: String,
    required: true
  },
  confirmations: {
    type: Number,
    required: true
  },
  estimatedTime: {
    type: String,
    default: '~5 min'
  },
  fee: {
    type: String,
    required: true
  },
  withdrawFee: {
    type: String,
    required: true
  },
  requiresMemo: {
    type: Boolean,
    default: false
  },
  memo: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  contactAddress: {
    type: String,
    default : null
  },
  rpcUrl: {
    type: String,
    required: true
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
 
  isNativeCoin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
 

const CryptoCoin = mongoose.model<ICryptoCoin>('CryptoCoin', CryptoCoinSchema);

export default CryptoCoin;
