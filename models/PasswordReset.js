// backend/models/PasswordReset.js
import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-delete documents 10 minutes after creation
passwordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

export default mongoose.model('PasswordReset', passwordResetSchema);