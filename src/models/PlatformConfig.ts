import mongoose, { Schema, Document } from 'mongoose'

export interface IPlatformConfig extends Document {
  appName: string
  maintenanceMode: boolean
  registrationEnabled: boolean
  referralBonus: number
  createdAt: Date
  updatedAt: Date
}

const PlatformConfigSchema = new Schema<IPlatformConfig>({
  appName: {
    type: String,
    required: [true, 'App name is required'],
    trim: true,
    minlength: [1, 'App name cannot be empty'],
    maxlength: [100, 'App name cannot exceed 100 characters'],
    default: 'Admin Panel'
  },
  maintenanceMode: {
    type: Boolean,
    required: [true, 'Maintenance mode is required'],
    default: false
  },
  registrationEnabled: {
    type: Boolean,
    required: [true, 'Registration enabled is required'],
    default: false
  },
  referralBonus: {
    type: Number,
    required: [true, 'Referral bonus is required'],
    min: [0, 'Referral bonus cannot be negative'],
    max: [100, 'Referral bonus cannot exceed 100'],
    default: 0
  }
}, {
  timestamps: true
})

// Ensure only one configuration document exists
PlatformConfigSchema.pre('save', async function() {
  const Model = mongoose.model('PlatformConfig');
  const count = await Model.countDocuments({ _id: { $ne: this._id } });
  if (count > 0) {
    throw new Error('Only one platform configuration document is allowed');
  }
});

export default mongoose.models.PlatformConfig || mongoose.model<IPlatformConfig>('PlatformConfig', PlatformConfigSchema)
