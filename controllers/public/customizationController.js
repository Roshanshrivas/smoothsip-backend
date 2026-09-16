import cloudinary from '../../config/cloudinary.js';
import getDataUri from '../../utils/dataUri.js';
import logger from '../../utils/logger.js';

export const uploadDesign = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUri = getDataUri(req.file);
    const result = await cloudinary.uploader.upload(fileUri.content, {
      folder: 'tumbler/customizations',
      width: 800,
      crop: 'scale',
    });
    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    logger.error('Upload design error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};