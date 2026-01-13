import mongoose, { Document, Schema } from 'mongoose';

export interface IAdsSettings extends Document {
  enableGigaPubAds: boolean;
  gigaPubAppId: string;
  defaultAdsReward: number;
  adsWatchLimit: number;
  adsRewardMultiplier: number;
  minWatchTime: number;
  monetagEnabled: boolean;
  monetagZoneId: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdsSettingsSchema = new Schema<IAdsSettings>({
  enableGigaPubAds: {
    type: Boolean,
    default: true,
    required: true
  },
  gigaPubAppId: {
    type: String,
    default: '',
    trim: true
  },
  defaultAdsReward: {
    type: Number,
    default: 0.01,
    min: 0.0001,
    max: 100000,
    required: true
  },
  adsWatchLimit: {
    type: Number,
    default: 10,
    min: 1,
    max: 100,
    required: true
  },
  adsRewardMultiplier: {
    type: Number,
    default: 1.0,
    min: 1,
    max: 100.0,
    required: true
  },
  minWatchTime: {
    type: Number,
    default: 30,
    min: 1,
    max: 500,
    required: true
  },
  monetagEnabled: {
    type: Boolean,
    default: false,
  },
  monetagZoneId: {
    type: String,
    default: null
  },
  
}, {
  timestamps: true,
});

// Create or export the model
const AdsSettings = mongoose.models.AdsSettings || mongoose.model<IAdsSettings>('AdsSettings', AdsSettingsSchema);

export default AdsSettings;
