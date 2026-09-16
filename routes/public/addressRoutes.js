import express from 'express';
import { protect } from '../../middleware/auth.js';
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../controllers/public/addressController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getAddresses);
router.post('/', addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;