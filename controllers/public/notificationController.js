import Notification from '../../models/Notification.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ─── Get user notifications ─────────────────────────
export const getNotifications = async (req, res) => {
  try {
    const { limit = 20, page = 1, filter = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const query = { user: req.userId };

    if (filter !== 'all') {
      query.type = filter;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(query),
    ]);

    const unreadCount = await Notification.countDocuments({ user: req.userId, isRead: false });

    res.json({
      success: true,
      notifications,
      total,
      unreadCount,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// ─── Mark notification as read ──────────────────────
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) throw new ApiError(404, 'Notification not found');
    res.json({ success: true, notification });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Mark all notifications as read ──────────────────
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.userId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// ─── Delete a notification ──────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!notification) throw new ApiError(404, 'Notification not found');
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Get unread count (used for navbar badge) ────────
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.userId, isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

// ─── (Internal) Create notification ──────────────────
// Used by other services (order, coupon, etc.)
export const createNotification = async (userId, type, title, message, metadata = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      metadata,
    });
    await notification.save();
    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    return null;
  }
};