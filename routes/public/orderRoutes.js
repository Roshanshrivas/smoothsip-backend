import express from 'express';
import { rateLimit } from '../../middleware/rateLimit.js';
import { protect } from '../../middleware/auth.js';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  trackOrder,
  trackByAwb,
  cancelOrder,
  getOrderStatus
} from '../../controllers/public/orderController.js';

import {
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
} from '../../controllers/public/paymentController.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/cancel', protect, cancelOrder);

// router.get('/track/:orderNumber', trackOrder);
// router.get('/status/:orderNumber', getOrderStatus);
// PUBLIC tracking — no protect, with rate limit

router.get('/track/:orderNumber', rateLimit({ max: 5, windowMs: 60 * 60_000, prefix: 'track' }), trackOrder);
router.get('/track-by-awb/:trackingNumber', rateLimit({ max: 5, windowMs: 60 * 60_000, prefix: 'track-awb' }), trackByAwb);
router.get('/status/:orderNumber', rateLimit({ max: 5, windowMs: 60 * 60_000, prefix: 'track-status' }), getOrderStatus);

// Payment routes (Razorpay)
router.post('/razorpay/initiate', protect, initiatePayment);
router.post('/razorpay/verify', protect, verifyPayment);
router.get('/:orderId/payment-status', protect, getPaymentStatus);

export default router;