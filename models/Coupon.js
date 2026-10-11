// models/Coupon.js
import mongoose from 'mongoose';

const couponUsageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now },
}, { _id: false });

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minimumOrder: { type: Number, default: 0 },
  maxDiscount: Number,
  startDate: { type: Date, default: Date.now },
  endDate: Date,

  // Global limits
  usageLimit: { type: Number, default: null },  // null = unlimited total uses
  usedCount: { type: Number, default: 0 },

  // ✅ Per-user limit (1 = one-time-per-user, null = unlimited per user)
  perUserLimit: { type: Number, default: 1 },

  // ✅ Track who used it and how many times
  usedBy: { type: [couponUsageSchema], default: [] },

  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);