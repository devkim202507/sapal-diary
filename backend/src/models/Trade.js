import mongoose from 'mongoose';

const TRADE_TYPES = ['BUY', 'SELL'];

const tradeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: TRADE_TYPES,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.00000001,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

tradeSchema.index({ userId: 1, date: 1 });
tradeSchema.index({ userId: 1, symbol: 1 });

export const Trade = mongoose.model('Trade', tradeSchema);
export { TRADE_TYPES };
