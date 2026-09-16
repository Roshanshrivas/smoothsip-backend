import express from 'express';
import { protect, admin } from '../../middleware/auth.js';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../../controllers/admin/categoryController.js';


const router = express.Router();

router.use(protect, admin);
router.get('/', getCategories);
router.post('/', createCategory);
router.get('/:id', getCategoryById);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;