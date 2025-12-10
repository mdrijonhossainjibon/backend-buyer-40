import mongoose, { Schema, Document } from 'mongoose'

// Mystery Box Settings interface (Admin configurable)
export interface IMysteryBoxSettings extends Document {
  enabled: boolean
  
  // Activity requirements to unlock mystery box
  requirements: {
    minTasksCompleted: number
    minSpinsCompleted: number
    minAdsWatched: number
    minDaysActive: number
    minTotalXP: number
  }
  
  // Cooldown settings
  cooldownHours: number
  maxBoxesPerDay: number
  
  // Reward configuration
  rewards: {
    minUSDT: number
    maxUSDT: number
    minXP: number
    maxXP: number
    minTickets: number
    maxTickets: number
    jackpotUSDT: number
    jackpotProbability: number // percentage (0-100)
  }
  
  createdAt: Date
  updatedAt: Date
}

// User Mystery Box Progress interface
export interface IUserMysteryBox extends Document {
  userId: number
  
  // Activity tracking
  tasksCompleted: number
  spinsCompleted: number
  adsWatched: number
  daysActive: number
  totalXP: number
  
  // Box status
  isEligible: boolean
  canClaim: boolean
  nextAvailableAt: Date | null
  boxesClaimedToday: number
  totalBoxesClaimed: number
  
  // Rewards history
  totalUSDTEarned: number
  totalXPEarned: number
  totalTicketsEarned: number
  jackpotsWon: number
  
  lastClaimAt: Date | null
  lastActivityAt: Date
  createdAt: Date
  updatedAt: Date
}

// Mystery Box Settings Schema
const MysteryBoxSettingsSchema = new Schema<IMysteryBoxSettings>({
  enabled: {
    type: Boolean,
    required: true,
    default: true
  },
  requirements: {
    minTasksCompleted: {
      type: Number,
      required: true,
      default: 5,
      min: 0
    },
    minSpinsCompleted: {
      type: Number,
      required: true,
      default: 3,
      min: 0
    },
    minAdsWatched: {
      type: Number,
      required: true,
      default: 10,
      min: 0
    },
    minDaysActive: {
      type: Number,
      required: true,
      default: 1,
      min: 0
    },
    minTotalXP: {
      type: Number,
      required: true,
      default: 100,
      min: 0
    }
  },
  cooldownHours: {
    type: Number,
    required: true,
    default: 24,
    min: 1
  },
  maxBoxesPerDay: {
    type: Number,
    required: true,
    default: 3,
    min: 1
  },
  rewards: {
    minUSDT: {
      type: Number,
      required: true,
      default: 0.01,
      min: 0
    },
    maxUSDT: {
      type: Number,
      required: true,
      default: 1.0,
      min: 0
    },
    minXP: {
      type: Number,
      required: true,
      default: 50,
      min: 0
    },
    maxXP: {
      type: Number,
      required: true,
      default: 500,
      min: 0
    },
    minTickets: {
      type: Number,
      required: true,
      default: 1,
      min: 0
    },
    maxTickets: {
      type: Number,
      required: true,
      default: 5,
      min: 0
    },
    jackpotUSDT: {
      type: Number,
      required: true,
      default: 10.0,
      min: 0
    },
    jackpotProbability: {
      type: Number,
      required: true,
      default: 0.1,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true,
  collection: 'mystery_box_settings'
})

// User Mystery Box Schema
const UserMysteryBoxSchema = new Schema<IUserMysteryBox>({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  tasksCompleted: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  spinsCompleted: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  adsWatched: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  daysActive: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalXP: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  isEligible: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  canClaim: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  nextAvailableAt: {
    type: Date,
    default: null
  },
  boxesClaimedToday: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalBoxesClaimed: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalUSDTEarned: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalXPEarned: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalTicketsEarned: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  jackpotsWon: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastClaimAt: {
    type: Date,
    default: null
  },
  lastActivityAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'user_mystery_boxes'
})

// Indexes for better query performance
UserMysteryBoxSchema.index({ userId: 1 })
UserMysteryBoxSchema.index({ isEligible: 1, canClaim: 1 })
UserMysteryBoxSchema.index({ nextAvailableAt: 1 })
UserMysteryBoxSchema.index({ lastActivityAt: -1 })

// Export the models
const MysteryBoxSettingsModel = mongoose.models.MysteryBoxSettings || mongoose.model<IMysteryBoxSettings>('MysteryBoxSettings', MysteryBoxSettingsSchema)
const UserMysteryBoxModel = mongoose.models.UserMysteryBox || mongoose.model<IUserMysteryBox>('UserMysteryBox', UserMysteryBoxSchema)

export { MysteryBoxSettingsModel as MysteryBoxSettings }
export default UserMysteryBoxModel
