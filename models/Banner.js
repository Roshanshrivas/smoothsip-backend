import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  // ─── Common fields ────────────────────────────────
  title: { type: String, required: true },
  subtitle: String,
  image: { type: String },          // poster / main image
  videoUrl: String,                 // for hero video
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  link: String,
  ctaText: String,
  position: { type: String, enum: ['home_top', 'home_middle', 'home_bottom', 'sidebar'], default: 'home_top' },
  section: {
    type: String,
    enum: ['hero', 'features', 'lifestyle', 'whychoose', 'ugc', 'customize', 'footer'],
    required: true,
    unique: true,   // only one active banner per section
  },
  content: { type: mongoose.Schema.Types.Mixed, default: {} }, // per‑section JSON
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
}, { timestamps: true });

export default mongoose.model('Banner', bannerSchema);