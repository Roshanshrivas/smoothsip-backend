import Order from '../../models/Order.js';
import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import Coupon from '../../models/Coupon.js';
import { createNotification } from './notificationController.js';

// Create order (checkout)
export const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, notes, couponId } = req.body;
    
    // Basic validation
    if (!shippingAddress || !shippingAddress.address) {
      throw new ApiError(400, 'Shipping address is required');
    }

    // Get cart
    let cart = await Cart.findOne({ user: req.userId }).populate("items.product");

    if (!cart) {
      const guestId = req.cookies?.guestId;
      if (guestId) {
        cart = await Cart.findOne({ guestId }).populate("items.product");
        if (cart && cart.items.length > 0) {
          logger.info(`Using guest cart ${guestId} for user ${req.userId}`);
        }
      }
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    // Filter valid items (product must exist)
    const validItems = cart.items.filter((item) => item.product && (item.product._id || item.product.id));
    if (validItems.length === 0) {
      throw new ApiError(400, 'Your cart contains only unavailable products. Please remove them and try again.');
    }

     // ─── Step 1: Calculate raw subtotal ─────────────
    let subtotal = 0;
    const orderItems = validItems.map((item) => {
      const price = item.product.price || 0;
      subtotal += price * item.quantity;
      return {
        product: item.product._id || item.product.id,
        name: item.product.name || item.product.title,
        sku: item.product.sku || 'N/A',
        quantity: item.quantity,
        price: price,
        image: item.product.mainImage || item.product.image,
        customization: item.customization || {}
      };
    });
    
    // ─── Step 2: Apply coupon discount (if any) ──────
    let couponDiscount = 0;
    let appliedCoupon = null;

    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      if (coupon && coupon.active) {
        // Validate coupon
        if (coupon.minimumOrder && subtotal < coupon.minimumOrder) {
          throw new ApiError(400, `Minimum order amount ₹${coupon.minimumOrder} required`);
        }

        // Calculate discount based on subtotal
        if (coupon.discountType === "percentage") {
          couponDiscount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
            couponDiscount = coupon.maxDiscount;
          }
        } else if (coupon.discountType === "fixed") {
          couponDiscount = coupon.discountValue;
        }
        couponDiscount = Math.round(couponDiscount);

        // Increment usage
        coupon.usedCount += 1;
        await coupon.save();
        appliedCoupon = coupon;
      } else {
        throw new ApiError(400, "Invalid or inactive coupon");
      }
    }

    // ─── Step 3: Calculate discounted subtotal ──────
    const discountedSubtotal = Math.max(0, subtotal - couponDiscount);

    // ─── Step 4: Calculate tax on discounted subtotal ──
    const tax = Math.round(discountedSubtotal * 0.12); // 12% GST

    // ─── Step 5: Shipping (based on original or discounted? Usually original subtotal) ──
    // Most sites check original subtotal for free shipping threshold.
    const shipping = subtotal > 500 ? 0 : 50;

    // ─── Step 6: Final total ─────────────────────────
    const total = discountedSubtotal + tax + shipping;
    // Create order
    const order = await Order.create({
      user: req.userId,
      customer: req.user.name || 'Customer',
      email: req.user.email,
      phone: req.user.phone || '',
      shippingAddress,
      billingAddress: shippingAddress,
      items: orderItems,
      subtotal,
      tax,
      shipping,
      total,
      paymentMethod,
      paymentStatus: 'Unpaid',
      status: 'Pending',
      notes: notes || '',
      coupon: appliedCoupon?._id,
      couponDiscount: couponDiscount,
    });


   // ─── Clear cart & update stock (unchanged) ──────
    const orderedItemIds = validItems.map(item => item._id);
    cart.items = cart.items.filter((item) => !orderedItemIds.some(id => id.equals(item._id)));
    await cart.save();

    for (const item of orderItems) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      }
    }

     // ─── ✅ ADD NOTIFICATION ──────────────────────
    await createNotification(
      req.userId,
      'order',
      `Order ${order.orderNumber} placed`,
      `Your order #${order.orderNumber} has been successfully placed. We'll notify you once it's shipped.`,
      { orderId: order._id, orderNumber: order.orderNumber }
    );

    logger.info(`Order created: ${order.orderNumber} by ${req.user.email}`);
    res.status(201).json({ success: true, order });

  } catch (error) {
    logger.error('Create order error:', error);
    const status = error.statusCode || 500;
    const message = error.message || 'Failed to create order';
    res.status(status).json({ success: false, message });
  }
};

// Get my orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId }).sort('-createdAt');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ success: true, order });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Track order (public – no auth)
export const trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ success: true, order: {
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
      shippedDate: order.shippedDate,
      deliveredDate: order.deliveredDate
    }});
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'Pending' && order.status !== 'Processing') {
      throw new ApiError(400, 'Order cannot be cancelled at this stage');
    }
    order.status = 'Cancelled';
    order.cancellationReason = req.body.reason || 'Customer requested cancellation';
    await order.save();

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    logger.info(`Order cancelled: ${order.orderNumber}`);
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Get order status (public)
export const getOrderStatus = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ success: true, status: order.status });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};