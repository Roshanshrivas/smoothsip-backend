import Banner from '../../models/Banner.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ─── Helper: compute status ──────────────────────
const getBannerStatus = (banner) => {
  if (!banner.isActive) return 'inactive';
  const now = new Date();
  const start = new Date(banner.startDate);
  const end = new Date(banner.endDate);
  if (banner.startDate && start > now) return 'scheduled';
  if (banner.endDate && end < now) return 'expired';
  return 'active';
};

// ─── Admin: Get banners with filters & pagination ──
export const getBanners = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all', position = 'all', section = 'all' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
      ];
    }
    if (position !== 'all') query.position = position;
    if (section !== 'all') query.section = section;

    let allMatching = await Banner.find(query).sort({ order: 1, createdAt: -1 });
    let allWithStatus = allMatching.map(b => ({
      ...b.toObject(),
      status: getBannerStatus(b),
    }));
    if (status !== 'all') {
      allWithStatus = allWithStatus.filter(b => b.status === status);
    }
    const totalFiltered = allWithStatus.length;
    const start = (page - 1) * limit;
    const paginated = allWithStatus.slice(start, start + limit);

    res.json({
      success: true,
      banners: paginated,
      total: totalFiltered,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalFiltered / limit),
    });
  } catch (error) {
    logger.error('Get banners error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

// ─── Admin: Get single banner ─────────────────────
export const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) throw new ApiError(404, 'Banner not found');
    const bannerObj = banner.toObject();
    bannerObj.status = getBannerStatus(banner);
    res.json({ success: true, banner: bannerObj });
  } catch (error) {
    logger.error('Get banner error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Create banner ──────────────────────────
export const createBanner = async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    logger.info(`Banner created: ${banner.title}`);
    res.status(201).json({ success: true, banner });
  } catch (error) {
    logger.error('Create banner error:', error);
    res.status(500).json({ success: false, message: 'Failed to create' });
  }
};

// ─── Admin: Update banner ──────────────────────────
export const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) throw new ApiError(404, 'Banner not found');
    res.json({ success: true, banner });
  } catch (error) {
    logger.error('Update banner error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Delete banner ──────────────────────────
export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) throw new ApiError(404, 'Banner not found');
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    logger.error('Delete banner error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Toggle banner status ──────────────────
export const toggleBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) throw new ApiError(404, 'Banner not found');
    banner.isActive = !banner.isActive;
    await banner.save();
    logger.info(`Banner ${banner.title} toggled to ${banner.isActive ? 'active' : 'inactive'}`);
    res.json({ success: true, banner });
  } catch (error) {
    logger.error('Toggle banner error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Get banner stats ──────────────────────
export const getBannerStats = async (req, res) => {
  try {
    const all = await Banner.find({});
    const stats = { total: all.length, active: 0, scheduled: 0, expired: 0, inactive: 0 };
    all.forEach(b => {
      const status = getBannerStatus(b);
      stats[status] = (stats[status] || 0) + 1;
    });
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Banner stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};

// ─── Public: Get active banners (with optional section filter) ──
export const getActiveBanners = async (req, res) => {
  try {
    const { section } = req.query;
    const now = new Date();
    const query = {
      isActive: true,
      $or: [
        { startDate: { $lte: now } },
        { startDate: { $exists: false } },
        { startDate: null }
      ],
      $or: [
        { endDate: { $gte: now } },
        { endDate: { $exists: false } },
        { endDate: null }
      ]
    };
    if (section) query.section = section;
    const banners = await Banner.find(query).sort({ order: 1 });
    res.json({ success: true, banners });
  } catch (error) {
    logger.error('Get active banners error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};