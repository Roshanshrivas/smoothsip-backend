import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getSettings,
  updateSettings,
  resetSettings,
  testEmail,
} from '../../controllers/admin/settingsController.js';

const router = express.Router();
router.use(protect, admin);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/reset', resetSettings);
router.post('/test-email', testEmail);

export default router;