import mongoose, { Document, Schema } from 'mongoose';

export interface ISpinHistory extends Document {
  userId: number;
  segmentId: string;
  segmentLabel: string;
  winAmount: number;
  spinDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SpinHistorySchema = new Schema<ISpinHistory>({
  userId: {
    type: Number,
    required: true,
    index: true,
    ref: 'User'
  },
  segmentId: {
    type: String,
    required: true
  },
  segmentLabel: {
    type: String,
    required: true
  },
  winAmount: {
    type: Number,
    required: true,
    min: 0
  },
  spinDate: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
SpinHistorySchema.index({ userId: 1, spinDate: -1 });

const SpinHistory = mongoose.models.SpinHistory || mongoose.model<ISpinHistory>('SpinHistory', SpinHistorySchema);

export default SpinHistory;
