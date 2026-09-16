import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    index: true,
  },
  guestId: {
    type: String,
    index: true,
  },
  products: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
  }]
}, { timestamps: true });

export default mongoose.model('Wishlist', wishlistSchema);