import mongoose, { Schema, Document } from 'mongoose';

export interface IUpdateInfo extends Document {
  version: string;
  currentVersion: string;
  size: string;
  description: string;
  downloadUrl: string;
  packageName: string;
  fileName: string;
  releaseDate: Date;
  isForceUpdate: boolean;
  minSupportedVersion: string;
  changelog?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UpdateInfoSchema = new Schema<IUpdateInfo>({
  version: {
    type: String,
    required: [true, 'Version is required'],
    unique: true,
    trim: true,
    match: [/^\d+\.\d+\.\d+$/, 'Version must be in semantic version format (x.y.z)']
  },
  currentVersion: {
    type: String,
    required: [true, 'Current version is required'],
    trim: true,
    match: [/^\d+\.\d+\.\d+$/, 'Current version must be in semantic version format (x.y.z)']
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  downloadUrl: {
    type: String,
    required: [true, 'Download URL is required'],
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Download URL must be a valid HTTP/HTTPS URL'
    }
  },
  packageName: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  releaseDate: {
    type: Date,
    required: [true, 'Release date is required'],
    default: Date.now
  },
  isForceUpdate: {
    type: Boolean,
    default: false,
    required: true
  },
  minSupportedVersion: {
    type: String,
    required: [true, 'Minimum supported version is required'],
    trim: true,
    match: [/^\d+\.\d+\.\d+$/, 'Minimum supported version must be in semantic version format (x.y.z)']
  },
  changelog: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each changelog item cannot exceed 200 characters']
  }],
  isActive: {
    type: Boolean,
    default: true,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
UpdateInfoSchema.index({ version: 1, isActive: 1 });
UpdateInfoSchema.index({ releaseDate: -1 });

// Virtual to check if this is the latest version
UpdateInfoSchema.virtual('isLatest').get(function() {
  return this.isActive;
});

export default mongoose.models.UpdateInfo || mongoose.model<IUpdateInfo>('UpdateInfo', UpdateInfoSchema);
