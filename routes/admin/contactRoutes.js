import express from 'express';
import {
  getContactMessages,
  getContactMessage,
  markAsRead,
  updateContactStatus,
  deleteContactMessage,
  getUnreadCount,
} from '../../controllers/admin/contactController.js'; // ← updated path
import { protect, admin } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect, admin);

router.get('/', getContactMessages);
router.get('/unread-count', getUnreadCount);
router.get('/:id', getContactMessage);
router.patch('/:id/read', markAsRead);
router.patch('/:id/status', updateContactStatus);
router.delete('/:id', deleteContactMessage);

export default router;