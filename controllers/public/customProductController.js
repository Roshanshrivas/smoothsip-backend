import CustomProduct from '../../models/CustomProduct.js';
import { ApiError } from '../../utils/ApiError.js';

export const getActiveCustomProducts = async (req, res, next) => {
  try {
    const products = await CustomProduct.find({ status: 'Active' })
      .select('-__v')
      .sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) { next(error); }
};

export const getCustomProductById = async (req, res, next) => {
  try {
    const product = await CustomProduct.findById(req.params.id)
      .select('-__v');
    if (!product) throw new ApiError(404, 'Product not found');
    if (product.status !== 'Active') throw new ApiError(403, 'Product is not available');
    res.json({ success: true, product });
  } catch (error) { next(error); }
};