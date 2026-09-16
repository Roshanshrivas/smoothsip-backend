import express from 'express';
import { protect } from '../../middleware/auth.js';
import {
  getProductReviews,
  createReview,
} from '../../controllers/public/reviewController.js';
import upload from '../../config/multer.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// ─── Public routes ──────────────────────────────────────
router.get('/product/:productId', getProductReviews);
router.post('/', protect, createReview);

// ─── Upload review image ──────────────────────────────
router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const fileStr = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${fileStr}`;
    
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'tumbler/reviews',
      transformation: [
        { width: 600, crop: 'scale', quality: 'auto' }
      ],
    });
    
    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Review image upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

export default router;