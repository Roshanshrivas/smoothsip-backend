import express from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import {
  getAvailableCoupons,
  validateCoupon,
} from '../../controllers/public/couponController.js';

const router = express.Router();

router.get('/available', optionalAuth, getAvailableCoupons);
router.post('/validate', optionalAuth, validateCoupon);

export default router;