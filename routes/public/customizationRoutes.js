import express from 'express';
import { protect } from '../../middleware/auth.js';
import { uploadDesign } from '../../controllers/public/customizationController.js';
import upload from '../../config/multer.js';

const router = express.Router();
router.post('/upload', protect, upload.single('design'), uploadDesign);

export default router;