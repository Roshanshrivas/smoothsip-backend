import Wishlist from '../../models/Wishlist.js';
import Product from '../../models/Product.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

// ─── Helper: get user or guest identifier ──────────
const getWishlistOwner = (req, res) => {
  if (req.userId) {
    return { type: 'user', id: req.userId };
  }
  let guestId = req.cookies.guestId;
  if (!guestId) {
    guestId = uuidv4();
    res.cookie('guestId', guestId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
  return { type: 'guest', id: guestId };
};

// ─── Get Wishlist ──────────────────────────────────
export const getWishlist = async (req, res) => {
  try {
    const owner = getWishlistOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };

    let wishlist = await Wishlist.findOne(query).populate('products');
    if (!wishlist) {
      wishlist = await Wishlist.create({ ...query, products: [] });
    }

    res.json({
      success: true,
      items: wishlist.products,
      totalItems: wishlist.products.length,
    });
  } catch (error) {
    logger.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist' });
  }
};

// ─── Add to Wishlist ──────────────────────────────
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const owner = getWishlistOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };

    const update = { $addToSet: { products: productId } };
    const options = { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true };
    const wishlist = await Wishlist.findOneAndUpdate(query, update, options).populate('products');
   
    logger.info(`Added to wishlist: ${productId} (${owner.type})`);
    res.json({
      success: true,
      message: 'Added to wishlist',
      items: wishlist.products,
      totalItems: wishlist.products.length,
    });
  } catch (error) {
    logger.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add to wishlist' });
  }
};

// ─── Remove from Wishlist ─────────────────────────
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const owner = getWishlistOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };

    const wishlist = await Wishlist.findOneAndUpdate(
      query,
      { $pull: { products: productId } },
      { returnDocument: 'after' }
    ).populate('products');

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    logger.info(`Removed from wishlist: ${productId} (${owner.type})`);
    res.json({
      success: true,
      message: 'Removed from wishlist',
      items: wishlist.products,
      totalItems: wishlist.products.length,
    });
  } catch (error) {
    logger.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
};

// ─── Clear Wishlist ───────────────────────────────
export const clearWishlist = async (req, res) => {
  try {
    const owner = getWishlistOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };
    const wishlist = await Wishlist.findOne(query);
    
    if (wishlist) {
      wishlist.products = [];
      await wishlist.save();
    }
    res.json({ success: true, message: 'Wishlist cleared' });
  } catch (error) {
    logger.error('Clear wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear wishlist' });
  }
};