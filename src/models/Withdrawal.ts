import mongoose, { Schema, Document } from 'mongoose'

// Matches frontend WithdrawTransaction interface
export interface IWithdrawal extends Document {
  withdrawalId: string // Matches 'transactionId' in frontend
  userId: string
  amount: number
  currency: string // USDT, BTC, ETH, BNB, TRX
  network: string // TRC20, ERC20, BEP20, etc.
  address: string // Wallet address
  status: 'completed' | 'pending' | 'failed' | 'processing'
  requestedAt: Date // Matches 'date' in frontend
  fee?: number
  txHash?: string // Blockchain transaction hash
  processedAt?: Date
  processedBy?: number
  createdAt: Date
  updatedAt: Date
}

// Function to generate unique withdrawal ID
function generateWithdrawalId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `WD${timestamp}${random}`.toUpperCase()
}

const WithdrawalSchema = new Schema<IWithdrawal>({
  withdrawalId: {
    type: String,
    unique: true,
    required: true,
    default: generateWithdrawalId,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  network: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: 26,
    maxlength: 62,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['completed', 'pending', 'failed', 'processing'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  fee: {
    type: Number,
    default: 0,
    min: 0
  },
  txHash: {
    type: String,
    trim: true,
    index: true
  },
  processedAt: {
    type: Date,
    index: true
  },
  processedBy: {
    type: Number
  }
}, {
  timestamps: true,
  collection: 'withdrawals'
})

const Withdrawal = mongoose.models.Withdrawal || mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema)

export default Withdrawal