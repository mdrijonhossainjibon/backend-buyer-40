import mongoose, { Schema, Document } from 'mongoose'

export interface IClaimedTask extends Document {
  userId: number
  taskId: string
  platform: string
  status: 'pending' | 'verified' | 'completed' | 'rejected'
  reward: string
  claimedAt: Date
  verifiedAt?: Date
  completedAt?: Date
  metadata?: {
    telegramUsername?: string
    telegramUserId?: number
    channelId?: string
    groupId?: string
    verificationAttempts?: number
    [key: string]: any
  }
  createdAt: Date
  updatedAt: Date
}

const ClaimedTaskSchema = new Schema<IClaimedTask>({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  taskId: {
    type: String,
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'completed', 'rejected'],
    default: 'pending',
    required: true
  },
  reward: {
    type: String,
    required: true
  },
  claimedAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'claimed_tasks'
})

// Compound index to prevent duplicate claims
ClaimedTaskSchema.index({ userId: 1, taskId: 1 }, { unique: true })

const ClaimedTask = (mongoose.models.ClaimedTask || mongoose.model<IClaimedTask>('ClaimedTask', ClaimedTaskSchema))

export default ClaimedTask
