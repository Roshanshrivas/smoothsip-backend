// server/models/BulkInquiry.js
import mongoose from 'mongoose';

const bulkInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    company: { type: String, trim: true, maxlength: 150, default: '' },
    inquiryType: {
      type: String,
      enum: ['bulk', 'corporate', 'gifting', 'collaboration', 'other'],
      default: 'bulk',
      index: true,
    },
    quantity: { type: String, trim: true, maxlength: 50, default: '' },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },

    status: {
      type: String,
      enum: ['new', 'contacted', 'quoted', 'converted', 'closed'],
      default: 'new',
      index: true,
    },
    adminNote: { type: String, default: '' },
    contactedAt: { type: Date, default: null },
    contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

bulkInquirySchema.index({ createdAt: -1 });

export default mongoose.model('BulkInquiry', bulkInquirySchema);