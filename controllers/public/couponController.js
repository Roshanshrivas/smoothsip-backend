import Coupon from '../../models/Coupon.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ─── Get available coupons for the user ────────────
export const getAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();

    // Find all active coupons that are valid
    const query = {
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ]
    };

    let coupons = await Coupon.find(query).sort({ discountValue: -1 });

    res.json({
      success: true,
      coupons: coupons.map(c => ({
        id: c._id,
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minimumOrder: c.minimumOrder || 0,
        maxDiscount: c.maxDiscount,
        endDate: c.endDate,
      })),
    });
  } catch (error) {
    logger.error('Get available coupons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
};

// ─── Validate and apply coupon ────────────────────
export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) throw new ApiError(400, 'Coupon code is required');

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) throw new ApiError(404, 'Invalid coupon code');

    // Check active
    if (!coupon.active) throw new ApiError(400, 'Coupon is not active');

    // Check dates
    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) throw new ApiError(400, 'Coupon not yet valid');
    if (coupon.endDate && coupon.endDate < now) throw new ApiError(400, 'Coupon has expired');

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, 'Coupon usage limit reached');
    }

    // Check minimum order
    if (coupon.minimumOrder && subtotal < coupon.minimumOrder) {
      throw new ApiError(400, `Minimum order amount ₹${coupon.minimumOrder} required`);
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discount = coupon.discountValue;
    }

    // Round to nearest rupee
    discount = Math.round(discount);

    res.json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount,
        description: coupon.description,
      },
    });
  } catch (error) {
    logger.error('Validate coupon error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to validate coupon',
    });
  }
};