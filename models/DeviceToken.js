import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    deviceInfo: {
      userAgent: String,
      platform: { type: String, default: 'web' }, // 'web', 'ios', 'android'
      browser: String,
    },
    lastUsed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for cleaning up old tokens
deviceTokenSchema.index({ lastUsed: -1 });

export default mongoose.model('DeviceToken', deviceTokenSchema);