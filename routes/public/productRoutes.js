import express from 'express';
import { getPublicProducts, getProductById, getAvailableFilters } from '../../controllers/public/productController.js';

const router = express.Router();

router.get('/filters', getAvailableFilters);
router.get('/', getPublicProducts);
router.get('/:id', getProductById); 

export default router;