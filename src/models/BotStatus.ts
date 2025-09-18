import mongoose, { Schema, Document } from 'mongoose'

export interface IBotStatus extends Document {
  botUsername: string
  botStatus: 'online' | 'offline' | 'maintenance'
  botLastSeen: Date
  botVersion: string
  createdAt: Date
  updatedAt: Date
}

const BotStatusSchema: Schema = new Schema({
  botUsername: {
    type: String,
    required: true,
    unique: true,
    default: '@earnfromadsbd_bot'
  },
  botStatus: {
    type: String,
    enum: ['online', 'offline', 'maintenance'],
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

// Create or get existing model
const BotStatus = mongoose.models.BotStatus || mongoose.model<IBotStatus>('BotStatus', BotStatusSchema)

export default BotStatus
