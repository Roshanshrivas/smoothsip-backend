import express from 'express';
import { getPublicCategories } from '../../controllers/public/categoryController.js';

const router = express.Router();
router.get('/', getPublicCategories);

export default router;