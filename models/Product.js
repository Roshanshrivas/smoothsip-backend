import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  description: String,
  price: { type: Number, required: true }, // selling price
  comparePrice: Number, // original price
  costPrice: Number, // purchase cost (for profit calc)
  sku: { type: String, unique: true, sparse: true },
  barcode: { type: String, unique: true, sparse: true },
  images: [String],
  mainImage: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  tags: [String],
  stock: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  dimensions: { length: Number, width: Number, height: Number },
  isCustomizable: { type: Boolean, default: false },
  customizationOptions: {
    text: { enabled: Boolean, maxLength: Number, defaultText: String },
    logo: { enabled: Boolean, maxFileSize: Number, allowedFormats: [String] },
    font: { enabled: Boolean, options: [String] },
    color: { enabled: Boolean, options: [String] }
  },
  status: { type: String, enum: ['Active','Draft','Inactive'], default: 'Draft' },
  ratingsAverage: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  color: { type: String, default: '' },
  material: { type: String, default: 'Stainless Steel' },
  features: { type: [String], default: [] },
  specifications: { type: [{ label: String, value: String }], default: [] },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
}, { timestamps: true });

productSchema.pre('save', function() {
  if (this.isModified('name')) {
    this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  }
});

productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);