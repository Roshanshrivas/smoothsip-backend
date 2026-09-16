import express from 'express';
import { protect } from '../../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
} from '../../controllers/public/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllRead);
router.delete('/:id', deleteNotification);

export default router;