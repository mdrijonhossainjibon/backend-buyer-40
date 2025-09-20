import mongoose, { Schema, Document } from 'mongoose'

// Function to generate referral code like UID1542qA
function generateReferralCode(): string {
  const prefix = 'UID'
  const numbers = Math.floor(1000 + Math.random() * 9000) // 4 digit number
  const letters = Math.random().toString(36).substring(2, 4).toLowerCase() // 2 random letters
  const upperLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)) // 1 uppercase letter
  return `${prefix}${numbers}${letters}${upperLetter}`
}

export interface IUser extends Document {
  userId: number
  username?: string
  referralCode: string
  balanceTK: number
  referralCount: number
  dailyAdLimit: number
  watchedToday: number
  telegramBonus: number
  youtubeBonus: number
  status: 'active' | 'suspend'
  lastAdWatch?: Date
  lastLogin?: Date
  referredBy?: number
  totalEarned: number
  withdrawnAmount: number
  profile: {
    firstName?: string
    lastName?: string
    avatar?: string
    bio?: string
  }
  settings: {
    notifications: boolean
    language: string
    timezone: string
  }
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  userId: {
    type: Number,
    required: [true, 'User ID is required'],
    unique: true,
    index: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  referralCode: {
    type: String,
    unique: true,
    required: true,
    default: generateReferralCode,
    index: true
  },
  balanceTK: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  referralCount: {
    type: Number,
    default: 0,
    min: [0, 'Referral count cannot be negative']
  },
  dailyAdLimit: {
    type: Number,
    default: 10,
    min: [1, 'Daily ad limit must be at least 1']
  },
  watchedToday: {
    type: Number,
    default: 0,
    min: [0, 'Watched today cannot be negative']
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: [0, 'Total earned cannot be negative']
  },
  withdrawnAmount: {
    type: Number,
    default: 0,
    min: [0, 'Withdrawn amount cannot be negative']
  },
 
  telegramBonus: {
    type: Number,
    default: 0,
    min: [0, 'Telegram bonus cannot be negative']
  },
  youtubeBonus: {
    type: Number,
    default: 0,
    min: [0, 'YouTube bonus cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'suspend'],
    default: 'active',
    required: true
  },
  lastAdWatch: {
    type: Date
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  referredBy: {
    type: Number,
    ref: 'User'
  },
  
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    }
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'bn']
    },
    timezone: {
      type: String,
      default: 'Asia/Dhaka'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
 
 
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
