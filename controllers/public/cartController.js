import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../../utils/ApiError.js';


// ─── Helper: get user or guest identifier ──────────
const getCartOwner = (req, res) => {
  // If authenticated, use userId
  if (req.userId) {
    return { type: 'user', id: req.userId };
  }
  // Else get or create guestId from cookie
  let guestId = req.cookies.guestId;
  if (!guestId) {
    guestId = uuidv4();
    res.cookie('guestId', guestId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
  return { type: 'guest', id: guestId };
};

// Helper: Calculate exact subtotal & total item counts
const calculateCartTotals = (cart) => {
  let subtotal = 0;
  let totalItems = 0;

  if (cart && cart.items) {
    cart.items.forEach((item) => {
      const price = item.product?.price || 0;
      subtotal += price * item.quantity;
      totalItems += item.quantity;
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
    if (!cart) {
      cart = await Cart.create({ ...query, items: [] });
    }
    const { subtotal, totalItems } = calculateCartTotals(cart);
    res.json({ success: true, cart, subtotal, totalItems });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
};

// Add to cart
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, customization = {} } = req.body;
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');
    if (product.stock < quantity) throw new ApiError(400, 'Not enough stock');

    const owner = getCartOwner(req, res);
    const query = owner.type === 'user' ? { user: owner.id } : { guestId: owner.id };
    let cart = await Cart.findOne(query);
    if (!cart) {
      cart = await Cart.create({ ...query, items: [] });
    }

    // Check if item already exists with same customization
    const existingItem = cart.items.find((item) => 
      item.product.toString() === productId && 
      JSON.stringify(item.customization) === JSON.stringify(customization)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, customization });
    }

    await cart.save();
    await cart.populate('items.product');
    const { subtotal, totalItems } = calculateCartTotals(cart);
    res.json({ success: true, cart, subtotal, totalItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to add to cart'});
  }
};

// Update cart item
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
    res.json({  success: true, cart, subtotal, totalItems  });
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
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

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

// Clear cart
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