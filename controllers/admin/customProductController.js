import CustomProduct from '../../models/CustomProduct.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { v2 as cloudinary } from 'cloudinary';

// ─── Helper: extract public_id from Cloudinary URL ───
const extractPublicId = (url) => {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
  return match ? match[1].replace(/\.[^.]+$/, '') : null;
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    logger.info(`Deleted Cloudinary image: ${publicId}`);
  } catch (err) {
    logger.error(`Failed to delete Cloudinary image ${publicId}:`, err);
  }
};

// ─── Get all custom products ───
export const getCustomProducts = async (req, res) => {
  try {
    const products = await CustomProduct.find().sort('-createdAt');
    res.json({ success: true, products });
  } catch (error) {
    logger.error('Get custom products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch' });
  }
};

// ─── Get single custom product ───
export const getCustomProductById = async (req, res) => {
  try {
    const product = await CustomProduct.findById(req.params.id);
    if (!product) throw new ApiError(404, 'Product not found');
    res.json({ success: true, product });
  } catch (error) {
    logger.error('Get custom product error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Create custom product ───
export const createCustomProduct = async (req, res) => {
  try {
    const product = await CustomProduct.create(req.body);
    logger.info(`Custom product created: ${product.name}`);
    res.status(201).json({ success: true, product });
  } catch (error) {
    logger.error('Create custom product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create' });
  }
};

// ─── Update custom product – delete old image if changed ───
export const updateCustomProduct = async (req, res) => {
  try {
    const existing = await CustomProduct.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'Product not found');

    const newImage = req.body.mainImage;
    if (newImage && newImage !== existing.mainImage) {
      const oldPublicId = extractPublicId(existing.mainImage);
      if (oldPublicId) await deleteCloudinaryImage(oldPublicId);
    }

    const product = await CustomProduct.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json({ success: true, product });
  } catch (error) {
    logger.error('Update custom product error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Delete custom product – delete image from Cloudinary ───
export const deleteCustomProduct = async (req, res) => {
  try {
    const product = await CustomProduct.findById(req.params.id);
    if (!product) throw new ApiError(404, 'Product not found');

    const publicId = extractPublicId(product.mainImage);
    if (publicId) await deleteCloudinaryImage(publicId);

    await CustomProduct.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    logger.error('Delete custom product error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};