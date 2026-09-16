import mongoose from 'mongoose';

const customProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  basePrice: { type: Number, required: true },
  mainImage: { type: String, required: true },
  images: [String], // additional images
  status: { type: String, enum: ['Draft', 'Active', 'Inactive'], default: 'Draft' },
  tumblerColor: { type: String, default: '#1a1a1a' },
  // Customisation toggles – admins enable/disable these
  customization: {
    text: { type: Boolean, default: true },
    color: { type: Boolean, default: true },
    font: { type: Boolean, default: true },
    logo: { type: Boolean, default: true },
    pattern: { type: Boolean, default: true },
  },
  allowedColors: { type: [String], default: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ff8c00'] },
  allowedFonts: { type: [String], default: ['Poppins', 'Arial', 'Georgia'] },
  textArea: {
    left: { type: Number, default: 50 },
    top: { type: Number, default: 200 },
    width: { type: Number, default: 400 },
    height: { type: Number, default: 200 },
  },
  logoArea: {
    left: { type: Number, default: 150 },
    top: { type: Number, default: 50 },
    width: { type: Number, default: 200 },
    height: { type: Number, default: 150 },
  },
  salesCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('CustomProduct', customProductSchema);