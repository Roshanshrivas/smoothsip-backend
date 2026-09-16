import express from 'express';
import { protect } from '../../middleware/auth.js';
import { savePushToken, removePushToken } from '../../controllers/public/userController.js';

const router = express.Router();

// ─── Public (authenticated) routes ──────────────
router.post('/push-token', protect, savePushToken);
router.delete('/push-token', protect, removePushToken);

export default router;