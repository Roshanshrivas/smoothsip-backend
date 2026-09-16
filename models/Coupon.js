import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  discountType: { type: String, enum: ['percentage','fixed'], required: true },
  discountValue: { type: Number, required: true },
  minimumOrder: { type: Number, default: 0 },
  maxDiscount: Number,
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);