import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  userId: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' 
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  metadata?: any
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Number,
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'welcome', 'bonus'],
    default: 'info',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

 
// Virtual for time ago
NotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date()
  const diff = now.getTime() - this.createdAt.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) {
    return `${minutes} মিনিট আগে`
  } else if (hours < 24) {
    return `${hours} ঘন্টা আগে`
  } else {
    return `${days} দিন আগে`
  }
})

// Static method to create notification
NotificationSchema.statics.createNotification = async function(notificationData: {
  userId: number
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'welcome' | 'bonus'
  priority?: 'low' | 'medium' | 'high'
  metadata?: any
  expiresAt?: Date
}) {
  return this.create(notificationData)
}

 

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)

export default Notification
