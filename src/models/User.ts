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
  watchedToday: number
  status: 'active' | 'suspend'
  lastLogin?: Date
  referredBy?: number
  lastTokenUpdate?: Date
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
 
  status: {
    type: String,
    enum: ['active', 'suspend'],
    default: 'active',
    required: true
  },
 
  lastLogin: {
    type: Date,
    default: Date.now
  },
  referredBy: {
    type: Number,
    ref: 'User'
  },

  lastTokenUpdate: {
    type: Date
  },
  
}, {
  timestamps: true,
   
})
 
 
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
