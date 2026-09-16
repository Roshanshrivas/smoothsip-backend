import Coupon from '../../models/Coupon.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ─── Get all coupons (admin) ──────────────────────
export const getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'active') query.active = true;
    else if (status === 'inactive') query.active = false;

    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      coupons,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    logger.error('Get coupons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
};

// ─── Get single coupon ────────────────────────────
export const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Create coupon ─────────────────────────────────
export const createCoupon = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minimumOrder, maxDiscount, startDate, endDate, usageLimit, active } = req.body;

    // Check duplicate code
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) throw new ApiError(400, 'Coupon code already exists');

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minimumOrder: minimumOrder || 0,
      maxDiscount: maxDiscount || null,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      usageLimit: usageLimit || null,
      active: active !== undefined ? active : true,
    });

    logger.info(`Coupon created: ${coupon.code}`);
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    logger.error('Create coupon error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Update coupon ─────────────────────────────────
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const coupon = await Coupon.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    logger.info(`Coupon updated: ${coupon.code}`);
    res.json({ success: true, coupon });
  } catch (error) {
    logger.error('Update coupon error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Delete coupon ─────────────────────────────────
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    logger.info(`Coupon deleted: ${coupon.code}`);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    logger.error('Delete coupon error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Toggle coupon status ──────────────────────────
export const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    coupon.active = !coupon.active;
    await coupon.save();
    logger.info(`Coupon ${coupon.code} toggled to ${coupon.active ? 'active' : 'inactive'}`);
    res.json({ success: true, coupon });
  } catch (error) {
    logger.error('Toggle coupon error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};