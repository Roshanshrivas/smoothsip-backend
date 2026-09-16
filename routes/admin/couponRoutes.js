import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
} from '../../controllers/admin/couponController.js';

const router = express.Router();

router.use(protect, admin);

router.get('/', getCoupons);
router.get('/:id', getCoupon);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);
router.patch('/:id/toggle', toggleCoupon);

export default router;