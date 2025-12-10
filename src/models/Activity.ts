import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IActivity extends Document {
  userId: number
  activityType: 'ad_watch' | 'task_complete' | 'referral' | 'bonus' | 'withdrawal' | 'login'
  description: string
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  metadata?: {
    adId?: string
    taskId?: string
    referralUserId?: number
    withdrawalMethod?: string
    ipAddress?: string
    userAgent?: string
    [key: string]: any
  }
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

 
const ActivitySchema = new Schema<IActivity>({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  activityType: {
    type: String,
    required: true,
    enum: ['ad_watch', 'task_complete', 'referral', 'bonus', 'withdrawal', 'login' , 'signup'],
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'activities'
})


const Activity = (mongoose.models.Activity || mongoose.model<IActivity >('Activity', ActivitySchema)) 

export default Activity
