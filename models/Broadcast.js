import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema({
  name: { type: String, required: true },
  channel: { type: String, enum: ['email','whatsapp','sms','push'], required: true },
  audience: String,
  audienceCount: Number,
  subject: String,
  message: { type: String, required: true },
  status: { type: String, enum: ['draft','scheduled','running','completed','cancelled'], default: 'draft' },
  scheduledDate: Date,
  sentAt: Date,
  sentCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  openCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  thumbnailImage: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Broadcast', broadcastSchema);