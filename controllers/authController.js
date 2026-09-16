import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import cloudinary from '../config/cloudinary.js';
import getDataUri from '../utils/dataUri.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, PASSWORD_RESET_SECRET } from '../utils/Token.js';
import Wishlist from '../models/Wishlist.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetOTPEmail } from '../utils/emailTemplates.js';


// Helper: Set HTTP-Only JWT Cookies and Send Standard User Response
const sendTokenResponse = async (user, statusCode, res, message) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(statusCode).json({
    success: true,
    message,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.avatar || user.photoUrl,
      phone: user.phone || '',
    },
  });
};

// ──────────────────────────────────────────────
// 1. REGISTER
// ──────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: phone || '',
      role: assignedRole,
    });

    // Auto-login user upon creation
    return await sendTokenResponse(user, 201, res, 'Registration successful');

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
    });
  }
};

// ──────────────────────────────────────────────
// 2. LOGIN
// ──────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is blocked
    if (user.status === 'Blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Contact support.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // ─── CART & WISHLIST MERGE LOGIC (FIXES THE EMPTY CART ON CHECKOUT) ───
    const guestId = req.cookies?.guestId;

    if (guestId) {
      const guestCart = await Cart.findOne({ guestId });
      
      if (guestCart && guestCart.items && guestCart.items.length > 0) {
        // Find or create the user's permanent account cart
        let userCart = await Cart.findOne({ user: user._id });
        if (!userCart) {
          userCart = await Cart.create({ user: user._id, items: [] });
        }

        // Merge each item from guest cart to user cart
        guestCart.items.forEach((guestItem) => {
          const existingItemIndex = userCart.items.findIndex(
            (item) => item.product?.toString() === guestItem.product?.toString()
          );

          if (existingItemIndex > -1) {
            // Product already exists in user cart, combine quantities
            userCart.items[existingItemIndex].quantity += guestItem.quantity;
          } else {
            userCart.items.push({
              product: guestItem.product,
              quantity: guestItem.quantity,
              customization: guestItem.customization || {},
            });
          }
        });

        // Recalculate numbers if your schema updates fields dynamically
        userCart.totalItems = userCart.items.reduce((acc, item) => acc + item.quantity, 0);

        await userCart.save();
        await Cart.deleteOne({ guestId });
      }

      // ---- Wishlist Merge ----
      const guestWishlist = await Wishlist.findOne({ guestId });
      if (guestWishlist && guestWishlist.products && guestWishlist.products.length > 0) {
        let userWishlist = await Wishlist.findOne({ user: user._id });
        if (!userWishlist) {
          userWishlist = await Wishlist.create({ user: user._id, products: [] });
        }
        const productIds = guestWishlist.products.map(p => p.toString());
        await Wishlist.updateOne(
          { _id: userWishlist._id },
          { $addToSet: { products: { $each: productIds } } }
        );
        await Wishlist.deleteOne({ guestId });
      }
      // Clear guest cookie after merge
      res.clearCookie('guestId');
    }

    // ─── Fix: sameSite: 'lax' ───
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // ✅ changed from 'strict'
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

// ──────────────────────────────────────────────
// 3. LOGOUT
// ──────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
      } catch (err) {
        // If token is invalid, still clear cookie
      }
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('guestId');

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

// ──────────────────────────────────────────────
// 4. REFRESH ACCESS TOKEN
// ──────────────────────────────────────────────
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided',
      });
    }
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid Refresh token',
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id, user.role);

    // ── Set new access token cookie ──
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
    });
  }
};

// ──────────────────────────────────────────────
// 5. GET CURRENT USER (Me)
// ──────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.avatar || user.photoUrl,
        phone: user.phone || '',
        description: user.description || '',
        gender: user.gender || '',
        preferences: user.preferences || {},
        status: user.status,
        ordersCount: user.ordersCount || 0,
        totalSpent: user.totalSpent || 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
};

// ──────────────────────────────────────────────
// 6. UPDATE PROFILE (with avatar upload)
// ──────────────────────────────────────────────

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone, description, gender, preferences } = req.body;
    const file = req.file;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    if (file) {
      const fileUri = getDataUri(file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
        folder: 'tumbler/avatars',
        width: 400,
        crop: 'scale',
      });
      user.avatar = cloudResponse.secure_url;
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (description !== undefined) user.description = description;
    if (gender) user.gender = gender;


    // Handle preferences (merge with existing)
    if (preferences) {
      try {
        const parsedPrefs = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
        user.preferences = { ...user.preferences, ...parsedPrefs };
      } catch (e) {
        // ignore invalid JSON
      }
    }

    await user.save();

     // Return updated user (excluding sensitive fields)
    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.refreshToken;

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        photoUrl: updatedUser.avatar,
        description: updatedUser.description,
        gender: updatedUser.gender,
        preferences: updatedUser.preferences,
        status: updatedUser.status,
        ordersCount: updatedUser.ordersCount,
        totalSpent: updatedUser.totalSpent,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};


// ─── CHANGE PASSWORD ───
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

// ─── DELETE ACCOUNT ───
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Optionally clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('guestId');
    return res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};


// ═══════════════════════════════════════════════════════════
//  FORGOT PASSWORD FLOW
// ═══════════════════════════════════════════════════════════

// ─── Request OTP for password reset ───
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, an OTP has been sent.',
    };

    const user = await User.findOne({ email: cleanEmail });

    // Don't reveal whether the account exists
    if (!user) {
      return res.json(genericResponse);
    }

    // 60-second cooldown per email
    const recentReset = await PasswordReset.findOne({
      email: cleanEmail,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recentReset) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 60 seconds before requesting another OTP.',
      });
    }

    // Cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Clear any old records for this email first
    await PasswordReset.deleteMany({ email: cleanEmail });

    const resetRecord = await PasswordReset.create({
      email: cleanEmail,
      otpHash,
    });

    // Send the email
    const emailResult = await sendPasswordResetOTPEmail(cleanEmail, otp);

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // Roll back the reset record so the user can retry immediately
      await PasswordReset.deleteOne({ _id: resetRecord._id });
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again in a moment.',
      });
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

// ─── Verify OTP and issue reset token ───
export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const resetRecord = await PasswordReset.findOne({ email: cleanEmail });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or invalid. Please request a new one.',
      });
    }

    if (resetRecord.attempts >= 5) {
      await PasswordReset.deleteMany({ email: cleanEmail });
      return res.status(400).json({
        success: false,
        message: 'Too many wrong attempts. Please request a new OTP.',
      });
    }

    const isValid = await bcrypt.compare(otp, resetRecord.otpHash);

    if (!isValid) {
      resetRecord.attempts += 1;
      await resetRecord.save();

      const left = 5 - resetRecord.attempts;

      if (left <= 0) {
        await PasswordReset.deleteMany({ email: cleanEmail });
        return res.status(400).json({
          success: false,
          message: 'Too many wrong attempts. Please request a new OTP.',
        });
      }

      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.`,
      });
    }

    // Issue reset token
    const resetToken = jwt.sign(
      { email: cleanEmail, purpose: 'password_reset' },
       PASSWORD_RESET_SECRET,
      { expiresIn: '15m' }
    );

    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    resetRecord.verified = true;
    resetRecord.resetToken = resetTokenHash;
    resetRecord.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await resetRecord.save();

    return res.json({
      success: true,
      message: 'OTP verified. You can now reset your password.',
      resetToken,
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

// ─── Reset password with token ───
export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset token, and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify the JWT
    let payload;
    try {
      payload = jwt.verify(resetToken, PASSWORD_RESET_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Reset link expired. Please start over.',
      });
    }

    if (payload.purpose !== 'password_reset' || payload.email !== cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token.',
      });
    }

    const resetRecord = await PasswordReset.findOne({
      email: cleanEmail,
      verified: true,
    });

    if (
      !resetRecord ||
      !resetRecord.resetToken ||
      !resetRecord.resetTokenExpires ||
      resetRecord.resetTokenExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Reset session expired. Please start over.',
      });
    }

    const tokenMatches = await bcrypt.compare(resetToken, resetRecord.resetToken);
    if (!tokenMatches) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token.',
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // ✅ FIX: assign raw password; pre-save hook handles hashing
    user.password = newPassword;
    user.refreshToken = null; // invalidate all existing sessions
    await user.save();

    // Clean up all reset records for this email
    await PasswordReset.deleteMany({ email: cleanEmail });

    // Clear any existing auth cookies on this browser
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.json({
      success: true,
      message: 'Password reset successful. You can now sign in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};