import mongoose, { Schema, Document } from 'mongoose';

export interface IUpdateDownload extends Document {
  version: string;
  userId?: number;
  deviceId?: string;
  platform: 'android' | 'ios';
  downloadStarted: Date;
  downloadCompleted?: Date;
  updateStatus: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string;
  fileSize?: string;
  downloadProgress?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UpdateDownloadSchema = new Schema<IUpdateDownload>({
  version: {
    type: String,
    required: [true, 'Version is required'],
    trim: true,
    match: [/^\d+\.\d+\.\d+$/, 'Version must be in semantic version format (x.y.z)'],
    index: true
  },
  userId: {
    type: Number,
    ref: 'User',
    index: true
  },
  deviceId: {
    type: String,
    trim: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['android', 'ios'],
    required: [true, 'Platform is required'],
    index: true
  },
  downloadStarted: {
    type: Date,
    default: Date.now,
    required: true
  },
  downloadCompleted: {
    type: Date
  },
  updateStatus: {
    type: String,
    enum: ['pending', 'downloading', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    required: true,
    index: true
  },
  errorMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Error message cannot exceed 500 characters']
  },
  fileSize: {
    type: String,
    trim: true
  },
  downloadProgress: {
    type: Number,
    min: [0, 'Download progress cannot be negative'],
    max: [100, 'Download progress cannot exceed 100%'],
    default: 0
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
UpdateDownloadSchema.index({ version: 1, platform: 1, updateStatus: 1 });
UpdateDownloadSchema.index({ userId: 1, downloadStarted: -1 });
UpdateDownloadSchema.index({ deviceId: 1, version: 1 });
UpdateDownloadSchema.index({ downloadStarted: -1 });

// Virtual to calculate download duration
UpdateDownloadSchema.virtual('downloadDuration').get(function() {
  if (this.downloadCompleted && this.downloadStarted) {
    return this.downloadCompleted.getTime() - this.downloadStarted.getTime();
  }
  return null;
});

// Virtual to check if download is in progress
UpdateDownloadSchema.virtual('isInProgress').get(function() {
  return ['pending', 'downloading'].includes(this.updateStatus);
});

export default mongoose.models.UpdateDownload || mongoose.model<IUpdateDownload>('UpdateDownload', UpdateDownloadSchema);
