// src/routes/public/wishlistRoutes.js
import express from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} from '../../controllers/public/wishlistController.js';

const router = express.Router();

router.get('/', optionalAuth, getWishlist);
router.post('/add', optionalAuth, addToWishlist);
router.delete('/remove/:productId', optionalAuth, removeFromWishlist);
router.delete('/clear', optionalAuth, clearWishlist);

export default router;