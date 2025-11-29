import mongoose, { Document, Schema } from 'mongoose';

export interface ISpinTicket extends Document {
  userId: number;
  ticketCount: number;
  totalPurchased: number;
  totalSpins: number;
  totalWinnings: number;
  freeSpinsUsed: number;
  extraSpinsUnlocked: number;
  extraSpinsUsed: number;
  lastResetDate?: Date;
  lastPurchaseDate?: Date;
  lastSpinDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SpinTicketSchema = new Schema<ISpinTicket>({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    ref: 'User'
  },
  ticketCount: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  totalPurchased: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  totalSpins: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  totalWinnings: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  freeSpinsUsed: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  extraSpinsUnlocked: {
    type: Number,
    default: 6,
    min: 1,
    required: true
  },
  extraSpinsUsed: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  lastPurchaseDate: {
    type: Date
  },
  lastSpinDate: {
    type: Date
  }
}, {
  timestamps: true
});

const SpinTicket = mongoose.models.SpinTicket || mongoose.model<ISpinTicket>('SpinTicket', SpinTicketSchema);

export default SpinTicket;
