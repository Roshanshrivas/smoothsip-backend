// server/controllers/admin/contactController.js
import ContactMessage from '../../models/ContactMessage.js';

// ──────────────────────────────────────────────
// ADMIN: List all contact messages (search + filter + paginate)
// ──────────────────────────────────────────────
export const getContactMessages = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status && ['new', 'read', 'replied', 'archived'].includes(status)) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      ContactMessage.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get contact messages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Get single message
// ──────────────────────────────────────────────
export const getContactMessage = async (req, res) => {
  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    return res.json({ success: true, message: msg });
  } catch (error) {
    console.error('Get contact message error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load message' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Mark as read
// ──────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    if (msg.status === 'new') {
      msg.status = 'read';
      msg.readAt = new Date();
      await msg.save();
    }

    return res.json({ success: true, message: msg });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Update status / note
// ──────────────────────────────────────────────
export const updateContactStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    if (status && ['new', 'read', 'replied', 'archived'].includes(status)) {
      msg.status = status;
      if (status === 'replied' && !msg.repliedAt) {
        msg.repliedAt = new Date();
        msg.repliedBy = req.userId;
      }
    }
    if (typeof adminNote === 'string') msg.adminNote = adminNote;

    await msg.save();
    return res.json({ success: true, message: msg });
  } catch (error) {
    console.error('Update contact status error:', error);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Delete
// ──────────────────────────────────────────────
export const deleteContactMessage = async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Unread badge count
// ──────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const count = await ContactMessage.countDocuments({ status: 'new' });
    return res.json({ success: true, count });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
};