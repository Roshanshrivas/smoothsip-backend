import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  image: String,
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  status: { type: String, enum: ['Active','Inactive'], default: 'Active' },
  order: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

categorySchema.pre('save', function() {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }
});

// ─── Virtual: product count ──────────────────────────
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

export default mongoose.model('Category', categorySchema);