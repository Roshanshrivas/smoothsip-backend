import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, maxlength: 100 },
  comment: { type: String, required: true },
  images: { type: [String], default: [] },
  isVerifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reply: { type: String, default: '' },
  repliedAt: { type: Date },
  helpful: { type: Number, default: 0 },
  notHelpful: { type: Number, default: 0 },
  helpfulUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notHelpfulUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// Indexes for faster queries
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1, product: 1 });
reviewSchema.index({ createdAt: -1 });

export default mongoose.model('Review', reviewSchema);