import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getReviews,
  getReviewStats,
  updateReviewStatus,
  replyToReview,
  deleteReview,
  getReviewById,
} from '../../controllers/admin/reviewController.js';

const router = express.Router();
router.use(protect, admin);

router.get('/', getReviews);
router.get('/stats', getReviewStats);
router.get('/:id', getReviewById);
router.put('/:id/status', updateReviewStatus);
router.put('/:id/reply', replyToReview);
router.delete('/:id', deleteReview);

export default router;