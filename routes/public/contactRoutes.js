import express from 'express';
import { submitContactForm } from '../../controllers/public/contactController.js'; // ← updated path
import { rateLimit } from '../../middleware/rateLimit.js';

const router = express.Router();

router.post(
  '/',
  rateLimit({ max: 5, windowMs: 60 * 60_000, prefix: 'contact-ip' }),
  submitContactForm
);

export default router;