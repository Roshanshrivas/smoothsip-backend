import express from 'express';

import {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from '../../controllers/authController.js';
import { protect, admin } from '../../middleware/auth.js';
import upload from '../../config/multer.js';
import { rateLimit } from '../../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/account', protect, deleteAccount); 

// ─── Forgot Password Flow ───
router.post('/forgot-password', rateLimit({ max: 10, windowMs: 60 * 60_000, prefix: 'fp-ip' }), forgotPassword);
router.post('/verify-reset-otp', rateLimit({ max: 20, windowMs: 60 * 60_000, prefix: 'votp-ip' }), verifyResetOTP);
router.post('/reset-password', rateLimit({ max: 10, windowMs: 60 * 60_000, prefix: 'rp-ip' }), resetPassword);

export default router;