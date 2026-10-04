// server/routes/public/bulkInquiryRoutes.js
import express from 'express';
import { submitBulkInquiry } from '../../controllers/public/bulkInquiryController.js';
import { rateLimit } from '../../middleware/rateLimit.js';

const router = express.Router();

router.post(
  '/',
  rateLimit({ max: 3, windowMs: 60 * 60_000, prefix: 'bulk-ip' }),
  submitBulkInquiry
);

export default router;