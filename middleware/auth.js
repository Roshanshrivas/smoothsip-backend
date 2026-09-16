// src/middleware/auth.js
import { verifyAccessToken } from '../utils/token.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No access token',
      });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid access token',
    });
  }
};

export const admin = (req, res, next) => {
  if (req.userRole === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
};

// ─── NEW: Optional Authentication ───────────────
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      if (user) {
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;
      }
    }
    // Continue regardless of authentication status
    next();
  } catch (error) {
    // Token invalid or expired – continue as guest
    next();
  }
};