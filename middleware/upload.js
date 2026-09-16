import upload from "../config/multer";
import cloudinary from "../config/cloudinary";


// Upload file to Cloudinary
const uploadToCloudinary = (file, folder = "lms") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
};

// Convert multer middleware into a Promise
const multerSingle = (fieldName) => {
  return (req, res) => {
    return new Promise((resolve, reject) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  };
};

// Middleware
exports.uploadSingle = (fieldName) => {
  return async (req, res, next) => {
    try {
      // Upload file using Multer
      await multerSingle(fieldName)(req, res);

      // Upload to Cloudinary if file exists
      if (req.file) {
        const result = await uploadToCloudinary(req.file, "lms/images");
        req.fileUrl = result.secure_url;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Similarly for multiple files, use upload.array().