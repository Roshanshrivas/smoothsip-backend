import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

// ─── Get all admin notifications ──────────────────────
export const getAdminNotifications = async (req, res) => {
  try {
    const { limit = 20, page = 1, type, read, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      $or: [{ userId: null }, { userId: req.userId }],
    };
    
    if (type) query.type = type;

    if (read !== undefined) query.read = read === 'true';

    if (search && search.trim()) {
      // Search on title and message
      query.$and = [
        { $or: [{ userId: null }, { userId: req.userId }] },
        {
          $or: [
            { title: { $regex: search.trim(), $options: 'i' } },
            { message: { $regex: search.trim(), $options: 'i' } },
          ],
        },
      ];
      delete query.$or;
    }
    
   const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({
        ...query,
        read: false,
      }),
    ]);
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    logger.error('Get admin notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// ─── Mark a notification as read ──────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      _id: id,
      $or: [{ userId: null }, { userId: req.userId }],
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({ success: true, notification });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// ─── Mark all notifications as read ──────────────────
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [{ userId: null }, { userId: req.userId }],
        read: false,
      },
      { read: true }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// ─── Delete a notification ────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      _id: id,
      $or: [{ userId: null }, { userId: req.userId }],
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    await notification.deleteOne();
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

// ─── Create a notification (helper for other controllers) ──
export const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    return null;
  }
};

// ─── Create admin notification ────────────────────────
export const createAdminNotification = async (title, message, type = 'system', link = null, metadata = {}) => {
  try {
    const notification = await Notification.create({
      userId: null, // null = all admins
      title,
      message,
      type,
      link,
      metadata,
    });
    return notification;
  } catch (error) {
    logger.error('Create admin notification error:', error);
    return null;
  }
};