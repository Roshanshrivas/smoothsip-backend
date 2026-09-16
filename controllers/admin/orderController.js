// src/controllers/admin/orderController.js
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import Coupon from '../../models/Coupon.js';
import { createAdminNotification } from './notificationController.js';


// ─── Helper: fulfillment mapping ──────────────────
const fulfillmentMap = {
  'Pending': 'Pending',
  'Processing': 'Processing',
  'Shipped': 'Shipped',
  'Delivered': 'Delivered',
  'Cancelled': 'Cancelled'
};

// ─── Create order (admin) ──────────────────────────
export const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    // Ensure required fields
    if (!orderData.customer || !orderData.email || !orderData.items?.length) {
      throw new ApiError(400, 'Customer, email, and at least one item are required');
    }
    // Calculate total if not provided
    if (!orderData.total) {
      orderData.total = orderData.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    }
    const order = await Order.create(orderData);
    logger.info(`Admin created order ${order.orderNumber}`);

    await createAdminNotification(
      '📦 New Order Created',
      `Order #${order.orderNumber} has been created by admin for ${order.customer}`,
      'order',
      `/admin/orders/${order._id}`,
      { orderId: order._id, orderNumber: order.orderNumber }
    );

    res.status(201).json({ success: true, order });
  } catch (error) {
    logger.error('Admin create order error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Update order (full) ──────────────────────────
export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true, returnDocument: 'after' });
    if (!order) throw new ApiError(404, 'Order not found');
    logger.info(`Order ${order.orderNumber} updated by admin`);

    await createAdminNotification(
      '✏️ Order Updated',
      `Order #${order.orderNumber} has been updated by admin`,
      'order',
      `/admin/orders/${order._id}`,
      { orderId: order._id, orderNumber: order.orderNumber }
    );

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Update order error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Duplicate order ──────────────────────────────
export const duplicateOrder = async (req, res) => {
  try {
    const original = await Order.findById(req.params.id);
    if (!original) throw new ApiError(404, 'Order not found');
    const copyData = original.toObject();
    delete copyData._id;
    delete copyData.orderNumber;
    delete copyData.createdAt;
    delete copyData.updatedAt;
    copyData.status = 'Pending';
    copyData.paymentStatus = 'Unpaid';
    copyData.fulfillmentStatus = 'Pending';
    copyData.trackingNumber = null;
    copyData.shippedDate = null;
    copyData.deliveredDate = null;
    const newOrder = await Order.create(copyData);
    logger.info(`Order ${original.orderNumber} duplicated as ${newOrder.orderNumber}`);

     await createAdminNotification(
      '📋 Order Duplicated',
      `Order #${original.orderNumber} has been duplicated as #${newOrder.orderNumber}`,
      'order',
      `/admin/orders/${newOrder._id}`,
      { orderId: newOrder._id, orderNumber: newOrder.orderNumber, originalId: original._id }
    );

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    logger.error('Duplicate order error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};


// ─── Get all orders (admin) with filters ────────
export const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, search, startDate, endDate } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      orders,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// Get single order by ID (admin)
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ success: true, order });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Update order status (admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, shippedDate, deliveredDate } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');

    // Status transition validation
    const validTransitions = {
      'Pending': ['Processing', 'Cancelled'],
      'Processing': ['Shipped', 'Cancelled'],
      'Shipped': ['Delivered', 'Cancelled'],
      'Delivered': ['Returned'],
      'Cancelled': [],
      'Returned': []
    };

    if (status && !validTransitions[order.status]?.includes(status)) {
      throw new ApiError(400, `Cannot transition from ${order.status} to ${status}`);
    }

    if (status) {
      order.status = status;
      order.fulfillmentStatus = fulfillmentMap[status] || 'Pending';
    }
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (shippedDate) order.shippedDate = new Date(shippedDate);
    if (deliveredDate) order.deliveredDate = new Date(deliveredDate);

    await order.save();

   // Restore stock if cancelled
    if (status === 'Cancelled') {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
      }
    }

    logger.info(`Order ${order.orderNumber} status updated to ${status}, fulfillment: ${order.fulfillmentStatus}`);

    const statusEmojis = {
      'Pending': '⏳',
      'Processing': '⚙️',
      'Shipped': '🚚',
      'Delivered': '✅',
      'Cancelled': '❌',
      'Returned': '↩️'
    };
    const emoji = statusEmojis[status] || '📦';
    
    await createAdminNotification(
      `${emoji} Order Status Updated`,
      `Order #${order.orderNumber} status changed to ${status}`,
      'order',
      `/admin/orders/${order._id}`,
      { orderId: order._id, orderNumber: order.orderNumber, newStatus: status, previousStatus: order.status }
    );

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Delete order (admin)
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    logger.info(`Order ${order.orderNumber} deleted by admin`);

    await createAdminNotification(
      '🗑️ Order Deleted',
      `Order #${order.orderNumber} has been deleted by admin`,
      'order',
      null,
      { orderId: order._id, orderNumber: order.orderNumber }
    );

    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    logger.error('Delete order error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Get order statistics (for dashboard)
export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pending = await Order.countDocuments({ status: 'Pending' });
    const processing = await Order.countDocuments({ status: 'Processing' });
    const shipped = await Order.countDocuments({ status: 'Shipped' });
    const delivered = await Order.countDocuments({ status: 'Delivered' });
    const cancelled = await Order.countDocuments({ status: 'Cancelled' });
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.json({
      success: true,
      stats: {
        totalOrders,
        pending,
        processing,
        shipped,
        delivered,
        cancelled,
        totalRevenue: revenue,
        avgOrderValue: totalOrders > 0 ? revenue / totalOrders : 0,
        totalCustomers: await Order.distinct('user').then(arr => arr.length),
        salesGrowth: 0,
        avgOrderGrowth: 0,
        customersGrowth: 0,
        refunds: 0,
        refundsGrowth: 0,
      }
    });
  } catch (error) {
    logger.error('Get order stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order stats' });
  }
};

// Update payment status (admin)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    order.paymentStatus = paymentStatus;
    await order.save();
    logger.info(`Payment status updated for ${order.orderNumber} to ${paymentStatus}`);

    await createAdminNotification(
      '💳 Payment Status Updated',
      `Order #${order.orderNumber} payment status changed to ${paymentStatus}`,
      'order',
      `/admin/orders/${order._id}`,
      { orderId: order._id, orderNumber: order.orderNumber, paymentStatus }
    );

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Update payment status error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};