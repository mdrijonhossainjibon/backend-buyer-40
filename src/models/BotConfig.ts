import mongoose, { Document, Schema } from 'mongoose';

export interface IBotConfig extends Document {
  botUsername: string
  botToken: string
  botStatus: 'online' | 'offline' | 'maintenance'
  botLastSeen: Date
  botVersion: string
  createdAt: Date
  updatedAt: Date
}

const BotConfigSchema: Schema = new Schema({
  botToken: {
    type: String,
    required: true,
    default: null
  },
  botUsername: {
    type: String,
    unique: true,
    
  },
  botStatus: {
    type: String,
    enum: ['online', 'offline'],
    required: true,
    default: 'online'
  },
  botLastSeen: {
    type: Date,
    required: true,
    default: Date.now
  },
  botVersion: {
    type: String,
    required: true,
    default: 'v2.1.0'
  }
}, {
  timestamps: true
})

 

export const BotConfig = mongoose.models.BotConfig || mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);
