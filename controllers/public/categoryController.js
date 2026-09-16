import Category from '../../models/Category.js';
import logger from '../../utils/logger.js';

export const getPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'Active' })
      .sort({ order: 1, name: 1 })
      .select('name slug description image');
    res.json({ success: true, categories });
  } catch (error) {
    logger.error('Get public categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};