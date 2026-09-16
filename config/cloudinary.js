// src/routes/admin/cloudinaryRoutes.js
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { protect, admin } from '../middleware/auth.js';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


const imageTransformation = [
  {
    width: 1200,
    crop: 'limit',
    quality: 'auto:good',
    fetch_format: 'auto',
    flags: 'progressive',
    dpr: 'auto',
  },
];

// ─── Upload product image ──────────────────────────────
router.post('/upload-product-image', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Convert buffer to base64
    const fileStr = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${fileStr}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'tumbler/products',
      transformation: imageTransformation,
    });
    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Upload multiple product images ─────────────────────
router.post('/upload-product-images', protect, admin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const uploadedUrls = [];
    for (const file of req.files) {
      const fileStr = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${fileStr}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'tumbler/products',
        resource_type: 'image',
        transformation: imageTransformation,
      });
      uploadedUrls.push({ url: result.secure_url, publicId: result.public_id });
    }
    res.json({
      success: true,
      urls: uploadedUrls.map(u => u.url),
      publicIds: uploadedUrls.map(u => u.publicId),
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Delete image from Cloudinary ──────────────────────
router.post('/delete-image', protect, admin, async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId is required' });
    }
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'ok') {
      res.json({ success: true, message: 'Image deleted successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Delete failed: ' + result.result });
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── Upload video (for UGC Reels & Hero) ──────────────
router.post('/upload-video', protect, admin, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    // Check file type
    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Only MP4, WebM, MOV, and AVI files are allowed' 
      });
    }

    // Check file size (max 50MB)
    if (req.file.size > 50 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video file must be less than 50MB' 
      });
    }

    // Upload to Cloudinary as video
    const fileStr = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${fileStr}`;
    
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'tumbler/ugc-videos',
      resource_type: 'video',
      transformation: [
        { width: 720, crop: 'scale', quality: 'auto' },
        { fetch_format: 'auto' }
      ],
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
    });
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Delete video from Cloudinary ──────────────────────
router.post('/delete-video', protect, admin, async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId is required' });
    }

    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: 'video' 
    });

    if (result.result === 'ok') {
      res.json({ success: true, message: 'Video deleted successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Delete failed: ' + result.result });
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;