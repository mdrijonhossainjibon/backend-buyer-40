import mongoose, { Document, Schema } from 'mongoose';

export interface ISpinWheelSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  probability: number;
}

export interface ISpinWheelConfig extends Document {
  enabled: boolean;
  segments: ISpinWheelSegment[];
  maxSpinsPerDay: number;
  maxFreeSpins: number;
  maxExtraSpins: number;
  spinCooldownMinutes: number;
  ticketPrice: number;
  minBalanceRequired: number;
  createdAt: Date;
  updatedAt: Date;
}

const SpinWheelSegmentSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  color: {
    type: String,
    required: true
  },
  probability: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, { _id: false });

const SpinWheelConfigSchema = new Schema<ISpinWheelConfig>({
  enabled: {
    type: Boolean,
    default: true,
    required: true
  },
  segments: {
    type: [SpinWheelSegmentSchema],
    required: true,
    validate: {
      validator: function(segments: ISpinWheelSegment[]) {
        const totalProbability = segments.reduce((sum, seg) => sum + seg.probability, 0);
        return Math.abs(totalProbability - 100) < 0.01; // Allow small floating point errors
      },
      message: 'Total probability of all segments must equal 100%'
    }
  },
  maxSpinsPerDay: {
    type: Number,
    default: 10,
    min: 1,
    max: 50,
    required: true
  },
  maxFreeSpins: {
    type: Number,
    default: 4,
    min: 1,
    max: 20,
    required: true
  },
  maxExtraSpins: {
    type: Number,
    default: 6,
    min: 0,
    max: 30,
    required: true
  },
  spinCooldownMinutes: {
    type: Number,
    default: 60,
    min: 0,
    max: 1440,
    required: true
  },
  ticketPrice: {
    type: Number,
    default: 100,
    min: 1,
    required: true
  },
  minBalanceRequired: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  }
}, {
  timestamps: true
});

const SpinWheelConfig = mongoose.models.SpinWheelConfig || mongoose.model<ISpinWheelConfig>('SpinWheelConfig', SpinWheelConfigSchema);

export default SpinWheelConfig;
