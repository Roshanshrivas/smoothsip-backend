import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },

    // Status tracking for admin
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
      index: true,
    },

    // Admin tracking
    readAt: { type: Date, default: null },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminNote: { type: String, default: '' },

    // Metadata
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

export default mongoose.model('ContactMessage', contactMessageSchema);