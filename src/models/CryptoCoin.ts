import mongoose, { Schema, Document } from 'mongoose';

export interface INetworkInfo {
  network: string;               // e.g. "bep20-testnet", "erc20", "maple", "native"
  contractAddress?: string;      // optional for native coins
  minDeposit: string;
  minimumWithdraw: string;
  withdrawFee: string;
  requiresMemo?: boolean;
  memoLabel?: string;            // e.g. "Memo", "Tag", "Payment ID"f
  fee: string;                   // general fee (optional if per network is used)
  confirmations: number;
  estimatedTime?: string;   

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
  network: { type: String, required: true },
  contractAddress: { type: String },

  minDeposit: { type: String, required: true },
  minimumWithdraw: { type: String, required: true },
  withdrawFee: { type: String, required: true },

  requiresMemo: { type: Boolean, default: false },
  memoLabel: { type: String },

  fee: { type: String, required: true },

  confirmations: { type: Number, default: 12 },
  estimatedTime: { type: String },
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
