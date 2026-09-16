import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
  },
  guestId: { 
    type: String, 
    index: true 
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    },
    quantity: { 
      type: Number, 
      default: 1 
    },
    customization: { type: Object, default: {} }
  }],
  totalItems: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);