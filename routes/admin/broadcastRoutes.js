import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getBroadcasts,
  getBroadcastById,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  sendBroadcast,
  getBroadcastStats,
} from '../../controllers/admin/broadcastController.js';

const router = express.Router();
router.use(protect, admin);

router.get('/stats', getBroadcastStats);
router.get('/', getBroadcasts);

router.post('/', createBroadcast);
router.get('/:id', getBroadcastById);
router.put('/:id', updateBroadcast);
router.delete('/:id', deleteBroadcast);
router.post('/:id/send', sendBroadcast);

export default router;