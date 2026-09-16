import express from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../../controllers/public/cartController.js';

const router = express.Router();

router.get('/', optionalAuth, getCart);
router.post('/add', optionalAuth, addToCart);
router.put('/update/:itemId', optionalAuth, updateCartItem);
router.delete('/remove/:itemId', optionalAuth, removeFromCart);
router.delete('/clear', optionalAuth, clearCart);

export default router;