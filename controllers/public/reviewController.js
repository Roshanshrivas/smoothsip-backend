import Review from '../../models/Review.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ─── Get product reviews ───────────────────────────────
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    
    const query = { product: productId, status: 'approved' };
    const skip = (page - 1) * limit;
    
    let sortOption = { createdAt: -1 };
    if (sort === 'highest') sortOption = { rating: -1 };
    else if (sort === 'lowest') sortOption = { rating: 1 };
    else if (sort === 'helpful') sortOption = { helpful: -1 };
    
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user', 'name avatar')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(query)
    ]);
    
    // Get rating breakdown
    const ratingBreakdown = await Review.aggregate([
      { $match: { product: productId, status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);
    
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingBreakdown.forEach(item => {
      breakdown[item._id] = item.count;
    });
    
    const totalRatings = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const avgRating = totalRatings > 0 
      ? Object.entries(breakdown).reduce((sum, [rating, count]) => sum + (rating * count), 0) / totalRatings 
      : 0;

    res.json({
      success: true,
      reviews,
      stats: {
        total,
        avgRating: parseFloat(avgRating.toFixed(1)),
        breakdown,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    logger.error('Get product reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// ─── Create review ──────────────────────────────────────
export const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.userId;
    
    if (!productId) throw new ApiError(400, 'Product ID is required');
    if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be between 1 and 5');
    if (!comment || !comment.trim()) throw new ApiError(400, 'Review comment is required');
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');
    
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) throw new ApiError(400, 'You have already reviewed this product');
    
    // Check if user has purchased this product (for verified badge)
    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      status: 'delivered'
    });
    
    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      title: title?.trim() || '',
      comment: comment.trim(),
      images: images || [],
      isVerifiedPurchase: !!hasPurchased,
      status: 'pending'
    });
    
    res.status(201).json({
      success: true,
      review,
      message: 'Review submitted successfully! It will appear after admin approval.'
    });
  } catch (error) {
    logger.error('Create review error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Upload review image ───────────────────────────────
export const uploadReviewImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // This is handled by the route directly with Cloudinary
    // The route will handle the upload and return the URL
    res.json({ success: true, message: 'Image uploaded successfully' });
  } catch (error) {
    logger.error('Upload review image error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};