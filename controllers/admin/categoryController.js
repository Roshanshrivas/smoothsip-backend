import Category from '../../models/Category.js';
import Product from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ─── Get categories with pagination, search, status filter ───
export const getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      query.status = status;
    }

    // ─── 1. Get paginated categories ──────────────────
    const [categories, total] = await Promise.all([
      Category.find(query).sort({ order: 1, name: 1 }).skip(skip).limit(Number(limit)),
      Category.countDocuments(query)
    ]);

    // ─── 2. Get product count per category ─────────────
    const categoryIds = categories.map(c => c._id);
    const productCounts = await Product.aggregate([
      { $match: { category: { $in: categoryIds } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = productCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    // Attach product count to each category
    const categoriesWithCount = categories.map(c => ({
      ...c.toObject(),
      products: countMap[c._id.toString()] || 0
    }));

    // ─── 3. Stats (overall, ignoring pagination) ───────
    const statsQuery = {};
    if (search) {
      statsQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    // status filter is applied for stats as well (to match the filter)
    if (status !== 'all') {
      statsQuery.status = status;
    }
    const totalActive = await Category.countDocuments({ ...statsQuery, status: 'Active' });
    const totalInactive = await Category.countDocuments({ ...statsQuery, status: 'Inactive' });
    
    // Total products across all categories (with filters)
    const categoryIdsForStats = (await Category.find(statsQuery).select('_id')).map(c => c._id);
    const totalProductsAcrossAll = await Product.countDocuments({ category: { $in: categoryIdsForStats } });

    res.json({
      success: true,
      categories: categoriesWithCount,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      stats: {
        total,
        active: totalActive,
        inactive: totalInactive,
        totalProducts: totalProductsAcrossAll,
      }
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

// ─── Get single category ──────────────────────────
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent');
    if (!category) throw new ApiError(404, 'Category not found');
    // Get product count
    const productCount = await Product.countDocuments({ category: category._id });
    const categoryObj = category.toObject();
    categoryObj.products = productCount;
    res.json({ success: true, category: categoryObj });
  } catch (error) {
    logger.error('Get category error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Create category
export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    logger.info(`Category created: ${category.name}`);
    res.status(201).json({ success: true, category });
  } catch (error) {
    logger.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) throw new ApiError(404, 'Category not found');
    logger.info(`Category updated: ${category.name}`);
    res.json({ success: true, category });
  } catch (error) {
    logger.error('Update category error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new ApiError(404, 'Category not found');
    logger.info(`Category deleted: ${category.name}`);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    logger.error('Delete category error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};