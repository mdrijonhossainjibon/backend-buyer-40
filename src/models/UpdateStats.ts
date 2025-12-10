import mongoose, { Schema, Document } from 'mongoose';

export interface IUpdateStats extends Document {
  version: string;
  totalDownloads: number;
  successfulUpdates: number;
  failedUpdates: number;
  lastUpdateCheck: Date;
  platform?: 'android' | 'ios' | 'all';
  deviceStats?: {
    android: number;
    ios: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UpdateStatsSchema = new Schema<IUpdateStats>({
  version: {
    type: String,
    required: [true, 'Version is required'],
    trim: true,
    match: [/^\d+\.\d+\.\d+$/, 'Version must be in semantic version format (x.y.z)'],
    index: true
  },
  totalDownloads: {
    type: Number,
    default: 0,
    min: [0, 'Total downloads cannot be negative']
  },
  successfulUpdates: {
    type: Number,
    default: 0,
    min: [0, 'Successful updates cannot be negative']
  },
  failedUpdates: {
    type: Number,
    default: 0,
    min: [0, 'Failed updates cannot be negative']
  },
  lastUpdateCheck: {
    type: Date,
    default: Date.now,
    required: true
  },
  platform: {
    type: String,
    enum: ['android', 'ios', 'all'],
    default: 'all'
  },
  deviceStats: {
    android: {
      type: Number,
      default: 0,
      min: [0, 'Android device count cannot be negative']
    },
    ios: {
      type: Number,
      default: 0,
      min: [0, 'iOS device count cannot be negative']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for efficient queries
UpdateStatsSchema.index({ version: 1, platform: 1 });
UpdateStatsSchema.index({ lastUpdateCheck: -1 });

// Virtual to calculate success rate
UpdateStatsSchema.virtual('successRate').get(function() {
  const total = this.successfulUpdates + this.failedUpdates;
  return total > 0 ? (this.successfulUpdates / total) * 100 : 0;
});

// Virtual to calculate total platform downloads
UpdateStatsSchema.virtual('totalPlatformDownloads').get(function() {
  if (this.deviceStats) {
    return this.deviceStats.android + this.deviceStats.ios;
  }
  return this.totalDownloads;
});

export default mongoose.models.UpdateStats || mongoose.model<IUpdateStats>('UpdateStats', UpdateStatsSchema);
