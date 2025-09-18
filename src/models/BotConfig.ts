import mongoose, { Document, Schema } from 'mongoose';

export interface IBotConfig extends Document {
  botToken: string;
  botUsername: string;
  Status:  'online' | 'offline'
  lastUpdated: Date;
  createdAt: Date;
  webhookUrl: string;
  updatedAt: Date;
  // Ad watch configuration
  dailyAdLimit: number;
  adEarningAmount: number;
  adWatchEnabled: boolean;
}

const BotConfigSchema: Schema = new Schema({
  botToken: {
    type: String,
    required: true,
    unique: true
  },
  botUsername: {
    type: String,
    required: true
  },
   Status: {
    type: String,
    enum: ['online', 'offline'],
    required: true,
    default: 'offline'
  },
  webhookUrl: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Ad watch configuration
  dailyAdLimit: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  adEarningAmount: {
    type: Number,
    default: 5,
    min: 1,
    max: 1000
  },
  adWatchEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

 

export const BotConfig = mongoose.models.BotConfig || mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);
