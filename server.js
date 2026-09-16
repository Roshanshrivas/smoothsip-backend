import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
import compression from 'compression';
import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/public/healthRoutes.js';
import sitemapRoutes from './routes/sitemap.js';

// ─── Routes ─────────────────────────────────────
// Auth
import authRoute from './routes/public/authRoutes.js';

// Admin
import adminProductRoutes from './routes/admin/productRoutes.js';
import adminCategoryRoutes from './routes/admin/categoryRoutes.js';
import adminOrderRoutes from './routes/admin/orderRoutes.js';
import adminUserRoutes from './routes/admin/userRoutes.js';
import adminCustomProductRoutes from './routes/admin/customProductRoutes.js';
import adminCouponRoutes from './routes/admin/couponRoutes.js';
import adminBannerRoutes from './routes/admin/bannerRoutes.js';
import adminReviewRoutes from './routes/admin/reviewRoutes.js';
import adminBroadcastRoutes from './routes/admin/broadcastRoutes.js';
import adminAnalyticsRoutes from './routes/admin/analyticsRoutes.js';
import adminSettingsRoutes from './routes/admin/settingsRoutes.js';
import adminNotificationRoutes from './routes/admin/notificationRoutes.js';
import { maintenanceMode } from './middleware/maintenance.js';
import adminContactRoutes from './routes/admin/contactRoutes.js';

// Public
import publicProductRoutes from './routes/public/productRoutes.js';
import publicCartRoutes from './routes/public/cartRoutes.js';
import publicWishlistRoutes from './routes/public/publicWishlistRoutes.js';
import publicOrderRoutes from './routes/public/orderRoutes.js';
// import publicPaymentRoutes from './routes/public/paymentRoutes.js';
import publicReviewRoutes from './routes/public/reviewRoutes.js';
import publicCustomizationRoutes from './routes/public/customizationRoutes.js';
import publicCouponRoutes from './routes/public/couponRoutes.js';
import publicBannerRoutes from './routes/public/bannerRoutes.js'; 
import addressRoutes from './routes/public/addressRoutes.js';
import publicNotificationRoutes from './routes/public/notificationRoutes.js';
import publicCategoryRoutes from './routes/public/categoryRoutes.js';
import publicContactRoutes from './routes/public/contactRoutes.js';

import cloudinaryRoutes from './config/cloudinary.js';
import publicCustomProductRoutes from './routes/public/customProductRoutes.js';
import { startScheduledBroadcastProcessor } from './jobs/scheduleBroadcast.js';
import userRoutes from './routes/public/userRoutes.js';



dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;


// app.use(helmet());
app.use(compression());

const allowedOrigins = [
  'https://smoothsip.in',
  'https://www.smoothsip.in',
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.use('/api/health', healthRoutes);
app.use(maintenanceMode);

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));


// ─── API Routes ─────────────────────────────────

app.use('/sitemap.xml', sitemapRoutes);

// Auth
app.use("/api/auth", authRoute);

// Public
app.use('/api/products', publicProductRoutes);
app.use('/api/cart', publicCartRoutes);
app.use('/api/wishlist', publicWishlistRoutes);
app.use('/api/orders', publicOrderRoutes);
// app.use('/api/payment', publicPaymentRoutes);
app.use('/api/reviews', publicReviewRoutes);
app.use('/api/customize', publicCustomizationRoutes);
app.use('/api/coupons', publicCouponRoutes);
app.use('/api/banners', publicBannerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/notifications', publicNotificationRoutes);
app.use('/api/categories', publicCategoryRoutes);
app.use('/api/custom-products', publicCustomProductRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', publicContactRoutes);

// Admin Routes
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/custom-products', adminCustomProductRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/banners', adminBannerRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/broadcasts', adminBroadcastRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/cloudinary', cloudinaryRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/contacts', adminContactRoutes);

app.use((err, req, res, next) => {
  console.error('🔥', err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

connectDB();
startScheduledBroadcastProcessor();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));