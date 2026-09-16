// src/routes/admin/analyticsRoutes.js
import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getDashboardStats,
  getTopProducts,      
  getSalesByChannel,
  getCustomerGrowth,
  getFullAnalytics,
} from '../../controllers/admin/analyticsController.js';

const router = express.Router();
router.use(protect, admin);

router.get('/dashboard', getDashboardStats);
router.get('/top-products', getTopProducts);
router.get('/sales-by-channel', getSalesByChannel);
router.get('/customer-growth', getCustomerGrowth);
router.get('/full', getFullAnalytics);

export default router;