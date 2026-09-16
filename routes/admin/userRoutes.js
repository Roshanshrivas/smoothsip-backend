import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  getUserStats,
  bulkDeleteUsers,
  exportUsers,
  getAudienceCounts,
} from '../../controllers/admin/userController.js';

const router = express.Router();
router.use(protect, admin);

router.get('/audience-counts', getAudienceCounts);

router.get('/', getUsers);
router.get('/stats', getUserStats);
router.get('/export', exportUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/block', blockUser);
router.patch('/:id/unblock', unblockUser);
router.post('/bulk-delete', bulkDeleteUsers);

export default router;