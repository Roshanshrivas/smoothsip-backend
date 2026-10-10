// controllers/cartController.js
import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import CustomProduct from '../../models/CustomProduct.js';   // 👈 NEW IMPORT
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../../utils/ApiError.js';

// ─── Helper: get user or guest identifier ──────────
const getCartOwner = (req, res) => {
  if (req.userId) return { type: 'user', id: req.userId };
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

// ─── Helper: get price from either product type ────
// Regular products: product.price
// Custom products: product.basePrice
const getItemPrice = (item) => {
  // 1. Prefer snapshot inside customization (custom items)
  if (item.customization?.isCustom && item.customization?.price != null) {
    return Number(item.customization.price) || 0;
  }
  // 2. Regular product price
  if (item.product?.price != null) return Number(item.product.price) || 0;
  // 3. Custom product basePrice
  if (item.product?.basePrice != null) return Number(item.product.basePrice) || 0;
  return 0;
};

// ─── Helper: Calculate subtotal & item count ───────
const calculateCartTotals = (cart) => {
  let subtotal = 0;
  let totalItems = 0;
  if (cart && cart.items) {
    cart.items.forEach((item) => {
      subtotal += getItemPrice(item) * (item.quantity || 1);
      totalItems += item.quantity || 1;
    });
  }
  return { subtotal, totalItems };
};

// ─── Get Cart ──────────────────────────────────────
export const getCart = async (req, res) => {
  try {
    const owner = getCartOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };
    let cart = await Cart.findOne(query).populate('items.product');
    if (!cart) cart = await Cart.create({ ...query, items: [] });
    const { subtotal, totalItems } = calculateCartTotals(cart);
    res.json({ success: true, cart, subtotal, totalItems });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
};

// ─── Add to cart ───────────────────────────────────
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, customization = {} } = req.body;

    // ── Look in Product first ──
    let product = await Product.findById(productId);
    let isCustom = false;

    // ── If not found, look in CustomProduct ──
    if (!product) {
      product = await CustomProduct.findById(productId);
      if (product) isCustom = true;
    }

    if (!product) throw new ApiError(404, 'Product not found');

    // Stock check only for regular products (custom are made-to-order)
    if (!isCustom && product.stock < quantity) {
      throw new ApiError(400, 'Not enough stock');
    }

    const owner = getCartOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };
    let cart = await Cart.findOne(query);
    if (!cart) cart = await Cart.create({ ...query, items: [] });

    // ── Attach snapshot data for custom items so price/name/image survive populate() ──
    const enrichedCustomization = isCustom
      ? {
          ...customization,
          isCustom: true,
          name: product.name,
          price: product.basePrice,
          image: product.mainImage,
        }
      : customization;

    // Check for duplicate (same product + same customization)
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        JSON.stringify(item.customization) === JSON.stringify(enrichedCustomization)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        customization: enrichedCustomization,
      });
    }

    await cart.save();
    await cart.populate('items.product');
    const { subtotal, totalItems } = calculateCartTotals(cart);
    res.json({ success: true, cart, subtotal, totalItems });
  } catch (error) {
    console.error('Add to cart error:', error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || 'Failed to add to cart' });
  }
};

// ─── Update cart item ──────────────────────────────
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const owner = getCartOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };

    const cart = await Cart.findOne(query);
    if (!cart) throw new ApiError(404, 'Cart not found');

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product');
    const { subtotal, totalItems } = calculateCartTotals(cart);
    res.json({ success: true, cart, subtotal, totalItems });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
};

// ─── Remove from Cart ─────────────────────────────
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const owner = getCartOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };

    const cart = await Cart.findOne(query);
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });

    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
    await cart.save();
    await cart.populate('items.product');

    const { subtotal, totalItems } = calculateCartTotals(cart);
    res.json({ success: true, cart, subtotal, totalItems });
  } catch (error) {
    console.error('Remove cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

// ─── Clear cart ────────────────────────────────────
export const clearCart = async (req, res) => {
  try {
    const owner = getCartOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };
    const cart = await Cart.findOne(query);
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};