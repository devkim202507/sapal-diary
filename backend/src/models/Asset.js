import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    market: {
      type: String,
      trim: true,
      default: '',
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

assetSchema.index({ lastUsedAt: -1, usageCount: -1 });

export const Asset = mongoose.model('Asset', assetSchema);
