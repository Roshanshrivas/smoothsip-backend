import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBanner,
  getBannerStats,
} from '../../controllers/admin/bannerController.js';

const router = express.Router();
router.use(protect, admin);

router.get('/', getBanners);
router.get('/stats', getBannerStats);
router.get('/:id', getBannerById);
router.post('/', createBanner);
router.put('/:id', updateBanner);
router.patch('/:id/toggle', toggleBanner);
router.delete('/:id', deleteBanner);

export default router;