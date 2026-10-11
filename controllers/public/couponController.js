import Coupon from '../../models/Coupon.js';
import logger from '../../utils/logger.js';
import { ApiError } from '../../utils/ApiError.js';

// ─── Get available coupons for the current user ───
export const getAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();
    const userId = req.userId || null;
    const subtotal = Number(req.query.subtotal) || 0;

    // Fetch all active, currently-valid coupons
    const coupons = await Coupon.find({
      active: true,
      startDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    }).lean();

    const result = coupons
      // Skip if global usage limit reached
      .filter((c) => !c.usageLimit || c.usedCount < c.usageLimit)
      .map((c) => {
        const minOrderMet = !c.minimumOrder || subtotal >= c.minimumOrder;

        // Per-user usage
        let userUsageCount = 0;
        if (userId) {
          const entry = (c.usedBy || []).find(
            (u) => String(u.user) === String(userId)
          );
          userUsageCount = entry?.count || 0;
        }

        const perUserLimit = c.perUserLimit ?? 1;
        const userLimitReached =
          perUserLimit !== null && userUsageCount >= perUserLimit;

        // Discount preview (only if applicable)
        let previewDiscount = 0;
        if (minOrderMet && !userLimitReached) {
          if (c.discountType === 'percentage') {
            previewDiscount = (subtotal * c.discountValue) / 100;
            if (c.maxDiscount && previewDiscount > c.maxDiscount) {
              previewDiscount = c.maxDiscount;
            }
          } else {
            previewDiscount = c.discountValue;
          }
        }

        return {
          _id: c._id,
          code: c.code,
          description: c.description,
          discountType: c.discountType,
          discountValue: c.discountValue,
          maxDiscount: c.maxDiscount,
          minimumOrder: c.minimumOrder || 0,
          endDate: c.endDate,
          perUserLimit,
          userUsageCount,
          eligible: minOrderMet && !userLimitReached,
          amountToUnlock: minOrderMet
            ? 0
            : Math.max(0, (c.minimumOrder || 0) - subtotal),
          userLimitReached,
          previewDiscount: Math.round(previewDiscount),
        };
      })
      .sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.previewDiscount - a.previewDiscount;
      });

    res.json({ success: true, coupons: result });
  } catch (error) {
    logger.error('Get available coupons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
};

// ─── Validate and apply coupon ────────────────────
export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const userId = req.userId || null;

    if (!code) throw new ApiError(400, 'Coupon code is required');

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) throw new ApiError(404, 'Invalid coupon code');
    if (!coupon.active) throw new ApiError(400, 'This coupon is no longer active');

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new ApiError(400, 'This coupon is not yet valid');
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new ApiError(400, 'This coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, 'This coupon has reached its usage limit');
    }
    if (coupon.minimumOrder && subtotal < coupon.minimumOrder) {
      throw new ApiError(
        400,
        `Add ₹${coupon.minimumOrder - subtotal} more to use this coupon (min ₹${coupon.minimumOrder})`
      );
    }

    // ✅ Per-user check
    if (userId) {
      const entry = (coupon.usedBy || []).find(
        (u) => String(u.user) === String(userId)
      );
      const userCount = entry?.count || 0;
      const perUserLimit = coupon.perUserLimit ?? 1;

      if (perUserLimit !== null && userCount >= perUserLimit) {
        throw new ApiError(
          400,
          perUserLimit === 1
            ? 'You have already used this coupon'
            : `You've reached the limit (${perUserLimit} uses) for this coupon`
        );
      }
    }

    // Compute discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }
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