// server/routes/admin/bulkInquiryRoutes.js
import express from 'express';
import {
  getBulkInquiries,
  getBulkInquiry,
  updateBulkInquiry,
  deleteBulkInquiry,
  getBulkInquiryUnreadCount,
  getBulkInquiryStats,
} from '../../controllers/admin/bulkInquiryController.js';
import { protect, admin } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect, admin);

router.get('/', getBulkInquiries);
router.get('/stats', getBulkInquiryStats);
router.get('/unread-count', getBulkInquiryUnreadCount);
router.get('/:id', getBulkInquiry);
router.patch('/:id', updateBulkInquiry);
router.delete('/:id', deleteBulkInquiry);

export default router;