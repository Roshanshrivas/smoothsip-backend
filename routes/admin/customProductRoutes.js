import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getCustomProducts,
  getCustomProductById,
  createCustomProduct,
  updateCustomProduct,
  deleteCustomProduct
} from '../../controllers/admin/customProductController.js';

const router = express.Router();
router.use(protect, admin);

router.get('/', getCustomProducts);
router.post('/', createCustomProduct);
router.get('/:id', getCustomProductById);
router.put('/:id', updateCustomProduct);
router.delete('/:id', deleteCustomProduct);

export default router;