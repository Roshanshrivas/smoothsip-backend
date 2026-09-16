// src/controllers/admin/userController.js
import User from '../../models/User.js';
import DeviceToken from '../../models/DeviceToken.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import bcrypt from 'bcryptjs';

// ─── Get all users ──────────────────────────────
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).select('-password -refreshToken').skip(skip).limit(Number(limit)).sort('-createdAt'),
      User.countDocuments(query)
    ]);
    
   // Format users and add `id` alias
    const formattedUsers = users.map(user => {
      const obj = user.toObject();
      return {
        ...obj,
        id: obj._id,
        joined: obj.createdAt ? new Date(obj.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        lastLogin: obj.lastLogin ? new Date(obj.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never',
      };
    });

    res.json({ 
      success: true, 
      users: formattedUsers, 
      total, 
      page: Number(page), 
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// ─── Get single user ─────────────────────────────
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');
    if (!user) throw new ApiError(404, 'User not found');
    const userObj = user.toObject();
    userObj.id = userObj._id;
    res.json({ success: true, user: userObj });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Create user (admin) ─────────────────────────
export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, status } = req.body;
    if (!name || !email || !password) {
      throw new ApiError(400, 'Name, email, and password are required');
    }
    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(400, 'User already exists with this email');
    
    const user = new User({ name, email, password, phone, role, status });
    await user.save();
    logger.info(`Admin created user: ${user.email}`);

    const userObj = user.toObject();
    userObj.id = userObj._id;
    res.status(201).json({ success: true, user: userObj });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Update user ──────────────────────────────────
export const updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, status, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    await user.save();
    logger.info(`User ${user.email} updated by admin`);
    const userObj = user.toObject();
    userObj.id = userObj._id;
    res.json({ success: true, user: userObj });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Delete user ──────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    logger.info(`User ${user.email} deleted by admin`);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Block user ───────────────────────────────────
export const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    user.status = 'Blocked';
    await user.save();
    logger.info(`User ${user.email} blocked by admin`);
    res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    logger.error('Block user error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Unblock user ─────────────────────────────────
export const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    user.status = 'Active';
    await user.save();
    logger.info(`User ${user.email} unblocked by admin`);
    res.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    logger.error('Unblock user error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Get user statistics ──────────────────────────
export const getUserStats = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ status: 'Active' });
    const blocked = await User.countDocuments({ status: 'Blocked' });
    const inactive = await User.countDocuments({ status: 'Inactive' });
    const admins = await User.countDocuments({ role: 'admin' });
    const customers = await User.countDocuments({ role: 'user' });
    
    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

    res.json({
      success: true,
      stats: { total, active, blocked, inactive, admins, customers, newThisMonth }
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// ─── Bulk delete users ────────────────────────────
export const bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) throw new ApiError(400, 'No user IDs provided');
    
    // Check for active admins
    const admins = await User.find({ _id: { $in: ids }, role: 'admin', status: 'Active' });
    if (admins.length) {
      throw new ApiError(400, 'Cannot delete active admin users');
    }
    
    const result = await User.deleteMany({ _id: { $in: ids } });
    logger.info(`Bulk deleted ${result.deletedCount} users by admin`);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error('Bulk delete error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── Export users as CSV ──────────────────────────
export const exportUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;

    const users = await User.find(query).select('name email role status createdAt lastLogin ordersCount totalSpent').sort('-createdAt');
    
    // Build CSV
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined', 'Last Login', 'Orders Count', 'Total Spent'];
    const rows = users.map(u => [
      u._id,
      `"${u.name}"`,
      u.email,
      u.role,
      u.status,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
      u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '',
      u.ordersCount || 0,
      u.totalSpent || 0,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_${new Date().toISOString().slice(0,19)}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Export users error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};


export const getAudienceCounts = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // All users
    const all = await User.countDocuments();

    // Active users (logged in within last 30 days)
    const active = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo }
    });

    // Subscribed users (you may have a isSubscribed field)
    const subscribed = await User.countDocuments({
      isSubscribed: true
    });

    // App users (users with at least one push token)
    const appUsers = await User.aggregate([
      {
        $lookup: {
          from: 'devicetokens',
          localField: '_id',
          foreignField: 'userId',
          as: 'tokens'
        }
      },
      {
        $match: {
          'tokens.0': { $exists: true }
        }
      },
      {
        $count: 'count'
      }
    ]);
    const app = appUsers.length > 0 ? appUsers[0].count : 0;

    // Inactive users (not logged in within 30 days)
    const inactive = await User.countDocuments({
      lastLogin: { $lt: thirtyDaysAgo }
    });

    // Design enthusiasts (you can customize this based on your user data)
    const design = await User.countDocuments({
      interests: 'design' // Adjust based on your schema
    });

    res.json({
      success: true,
      all,
      active,
      subscribed,
      app,
      inactive,
      design,
    });
  } catch (error) {
    logger.error('Get audience counts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audience counts' });
  }
};