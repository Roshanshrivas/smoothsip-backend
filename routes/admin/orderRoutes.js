import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getOrders,
  getOrderById,
  createOrder,        // new
  updateOrder,        // new (full update)
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  duplicateOrder,     // new
  getOrderStats,
} from '../../controllers/admin/orderController.js';

const router = express.Router();

router.use(protect, admin);

router.get('/stats', getOrderStats);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);                     // admin create
router.put('/:id', updateOrder);                   // full update
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/payment', updatePaymentStatus);
router.post('/:id/duplicate', duplicateOrder);     // duplicate
router.delete('/:id', deleteOrder);

export default router;