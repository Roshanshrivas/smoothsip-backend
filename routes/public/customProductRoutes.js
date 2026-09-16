import express from 'express';
import { getActiveCustomProducts, getCustomProductById } from '../../controllers/public/customProductController.js';

const router = express.Router();
router.get('/', getActiveCustomProducts);
router.get('/:id', getCustomProductById);
export default router;