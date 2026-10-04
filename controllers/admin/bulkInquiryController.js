// server/controllers/admin/bulkInquiryController.js
import BulkInquiry from '../../models/BulkInquiry.js';

// ──────────────────────────────────────────────
// ADMIN: List all inquiries (search + filter + paginate)
// ──────────────────────────────────────────────
export const getBulkInquiries = async (req, res) => {
  try {
    const { status, search, type, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status && ['new', 'contacted', 'quoted', 'converted', 'closed'].includes(status)) {
      filter.status = status;
    }
    if (type && ['bulk', 'corporate', 'gifting', 'collaboration', 'other'].includes(type)) {
      filter.inquiryType = type;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [inquiries, total] = await Promise.all([
      BulkInquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('contactedBy', 'name email'),
      BulkInquiry.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      inquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get bulk inquiries error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load inquiries' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Get single inquiry
// ──────────────────────────────────────────────
export const getBulkInquiry = async (req, res) => {
  try {
    const inquiry = await BulkInquiry.findById(req.params.id).populate('contactedBy', 'name email');
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    return res.json({ success: true, inquiry });
  } catch (error) {
    console.error('Get bulk inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load inquiry' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Update status / note
// ──────────────────────────────────────────────
export const updateBulkInquiry = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const inquiry = await BulkInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    if (status && ['new', 'contacted', 'quoted', 'converted', 'closed'].includes(status)) {
      inquiry.status = status;
      if (status !== 'new' && !inquiry.contactedAt) {
        inquiry.contactedAt = new Date();
        inquiry.contactedBy = req.userId;
      }
    }
    if (typeof adminNote === 'string') inquiry.adminNote = adminNote;

    await inquiry.save();
    const populated = await BulkInquiry.findById(inquiry._id).populate('contactedBy', 'name email');
    return res.json({ success: true, inquiry: populated });
  } catch (error) {
    console.error('Update bulk inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Delete inquiry
// ──────────────────────────────────────────────
export const deleteBulkInquiry = async (req, res) => {
  try {
    const inquiry = await BulkInquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Delete bulk inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: New/unread badge count
// ──────────────────────────────────────────────
export const getBulkInquiryUnreadCount = async (req, res) => {
  try {
    const count = await BulkInquiry.countDocuments({ status: 'new' });
    return res.json({ success: true, count });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
};

// ──────────────────────────────────────────────
// ADMIN: Status breakdown
// ──────────────────────────────────────────────
export const getBulkInquiryStats = async (req, res) => {
  try {
    const stats = await BulkInquiry.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const total = await BulkInquiry.countDocuments();

    const byStatus = stats.reduce(
      (acc, s) => ({ ...acc, [s._id]: s.count }),
      { new: 0, contacted: 0, quoted: 0, converted: 0, closed: 0 }
    );

    return res.json({ success: true, total, byStatus });
  } catch (error) {
    console.error('Get bulk stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
};