import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IWithdrawal extends Document {
  withdrawalId: string
  userId: string
  amount: number
  method: 'Bkash' | 'nagad' | 'Binance'  
  accountDetails: {
    accountNumber: string
    accountName: string
    bankName?: string
    branchName?: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
  requestedAt: Date
  processedAt?: Date
  processedBy?: number // Admin userId who processed it
  rejectionReason?: string
  transactionId?: string
  fees: number
  netAmount: number // amount - fees
  metadata?: {
    ipAddress?: string
    userAgent?: string
    adminNotes?: string
    [key: string]: any
  }
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
  },
  method: {
    type: String,
    required: true,
    enum: ['Bkash', 'nagad', 'rocket', 'Binance'],
    index: true
  },
  accountDetails: {
    accountNumber: {
      type: String,
      required: true,
      trim: true
    },
    accountName: {
      type: String,
      required: true,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    branchName: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date,
    index: true
  },
  
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  transactionId: {
    type: String,
    trim: true,
    index: true
  },
  fees: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'withdrawals'
})


const Withdrawal = (mongoose.models.Withdrawal || mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema))  

export default Withdrawal
