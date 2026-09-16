import Order from '../../models/Order.js';
import { createRazorpayOrder, verifyPaymentSignature } from '../../config/payment.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';


export const initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.userId });
    if (!order) throw new ApiError(404, 'Order not found');

    const razorpayOrder = await createRazorpayOrder(order.total);
    order.paymentDetails = { razorpayOrderId: razorpayOrder.id };
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: order.total,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Payment initiation error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, razorpayOrderId } = req.body;
    const isValid = verifyPaymentSignature(razorpayOrderId, paymentId, signature);
    if (!isValid) throw new ApiError(400, 'Payment verification failed');

    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');

    order.paymentStatus = 'Paid';
    order.status = 'Processing';
    order.paymentDetails = { ...order.paymentDetails, paymentId, signature };
    await order.save();

    logger.info(`Payment verified for order: ${order.orderNumber}`);
    res.json({ success: true, message: 'Payment confirmed' });
  } catch (error) {
    logger.error('Payment verification error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ success: true, paymentStatus: order.paymentStatus });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};