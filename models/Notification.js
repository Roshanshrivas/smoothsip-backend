import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = admin notification (shown to all admins)
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['order', 'product', 'customer', 'system', 'review', 'broadcast'],
      default: 'system',
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);