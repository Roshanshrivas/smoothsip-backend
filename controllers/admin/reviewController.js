import Review from '../../models/Review.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ─── Get all reviews with pagination ──────────────────
export const getReviews = async (req, res) => {
  try {
    const { status, rating, search, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (rating && rating !== 'all') query.rating = parseInt(rating);
    
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .populate('product', 'name mainImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      reviews,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// ─── Get review stats ──────────────────────────────────
export const getReviewStats = async (req, res) => {
  try {
    const [total, pending, approved, rejected, avgRatingResult] = await Promise.all([
      Review.countDocuments(),
      Review.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'approved' }),
      Review.countDocuments({ status: 'rejected' }),
      Review.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        avgRating: avgRatingResult.length ? parseFloat(avgRatingResult[0].avg.toFixed(1)) : 0,
      }
    });
  } catch (error) {
    logger.error('Get review stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};

// ─── Update review status ──────────────────────────────
export const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }
    
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email').populate('product', 'name mainImage');
    
    if (!review) throw new ApiError(404, 'Review not found');
    
    res.json({ success: true, review });
  } catch (error) {
    logger.error('Update review status error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Reply to review ───────────────────────────────────
export const replyToReview = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      throw new ApiError(400, 'Reply content is required');
    }
    
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { 
        reply: reply.trim(),
        repliedAt: new Date(),
        status: 'approved' // Auto-approve when replying
      },
      { new: true }
    ).populate('user', 'name email').populate('product', 'name mainImage');
    
    if (!review) throw new ApiError(404, 'Review not found');
    
    res.json({ success: true, review });
  } catch (error) {
    logger.error('Reply to review error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Delete review ──────────────────────────────────────
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) throw new ApiError(404, 'Review not found');
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    logger.error('Delete review error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Get single review ──────────────────────────────────
export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'name email')
      .populate('product', 'name mainImage');
    if (!review) throw new ApiError(404, 'Review not found');
    res.json({ success: true, review });
  } catch (error) {
    logger.error('Get review by id error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};