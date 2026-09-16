import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getAdminNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../controllers/admin/notificationController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, admin);

// ─── Routes ────────────────────────────────────────────
router.get('/', getAdminNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;