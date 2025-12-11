import mongoose, { Schema, Document } from 'mongoose';

export interface INetworkInfo {
  id: string;                    // e.g. "bep20-testnet", "bsc-mainnet"
  name: string;                  // e.g. "BEP20 (BSC Mainnet)"
  network: string;               // reference to Network model id
  isDefault?: boolean;
  minDeposit: string;
  minimumWithdraw: string;
  withdrawFee: string;
  requiresMemo?: boolean;
  memoLabel?: string;            // e.g. "Memo", "Tag", "Payment ID"
  fee: string;                   // general fee (optional if per network is used)
  confirmations: number;
  estimatedTime?: string;
  contactAddress?: string;       // contract address for ERC20/BEP20/TRC20 tokens
  rpcUrl: string;                // RPC endpoint for the network
  type?: string;                 // e.g. "Native", "ERC20", "BEP20", "TRC20"
  isActive: boolean;             // whether this network is active for withdrawals
}

export interface ICryptoCoin extends Document {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  status: "active" | "disabled";
  networks: INetworkInfo[];
  createdAt: Date;
  updatedAt: Date;
}



/* ========== Network Schema ========== */
const NetworkSchema = new Schema<INetworkInfo>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  network: { type: String, required: true },
  isDefault: { type: Boolean, default: false },

  minDeposit: { type: String, required: true },
  minimumWithdraw: { type: String, required: true },
  withdrawFee: { type: String, required: true },

  requiresMemo: { type: Boolean, default: false },
  memoLabel: { type: String },

  fee: { type: String, required: true },

  confirmations: { type: Number, default: 12 },
  estimatedTime: { type: String },

  contactAddress: { type: String },
  rpcUrl: { type: String, required: true },
  type: { type: String },
  isActive: { type: Boolean, default: true }
});

/* ========== Crypto Coin Schema ========== */
const CryptoCoinSchema = new Schema<ICryptoCoin>(
  {
    id: { type: String, required: true, unique: true },

    name: { type: String, required: true },
    symbol: { type: String, required: true },
    icon: { type: String, required: true },

    status: { type: String, enum: ["active", "disabled"], default: "active" },
    networks: {
      type: [NetworkSchema],
      required: true,
      validate: {
        validator: (v: any[]) => v.length > 0,
        message: "At least one network is required",
      },
    },
  },
  {
    timestamps: true, // auto create createdAt / updatedAt
  }
);



const CryptoCoin = mongoose.model<ICryptoCoin>('CryptoCoin', CryptoCoinSchema);

export default CryptoCoin;
