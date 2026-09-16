import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed file types
const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp'];
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowedExtension = allowedExtensions.includes(extension);
  const isAllowedMimeType = allowedMimeTypes.includes(file.mimetype);

  if (isAllowedExtension && isAllowedMimeType) {
    return cb(null, true);
  }
  const error = new Error('Invalid file type. Only images are allowed.');
  error.statusCode = 400;
  cb(error);
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

export default upload;