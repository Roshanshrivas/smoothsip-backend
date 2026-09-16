import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock
} from '../../controllers/admin/productController.js';

const router = express.Router();

router.use(protect, admin);
router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProductById).put(updateProduct).delete(deleteProduct);
router.patch('/:id/stock', updateStock);

export default router;