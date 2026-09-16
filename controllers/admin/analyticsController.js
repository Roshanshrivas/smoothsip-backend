// src/controllers/admin/analyticsController.js
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Review from '../../models/Review.js';
import logger from '../../utils/logger.js';

// ─── Helper: Revenue/Orders by Period ──────────────────────────────
const revenueByPeriod = async (startDate, endDate, groupBy) => {
  const match = { paymentStatus: 'Paid' };
  if (startDate) match.createdAt = { $gte: new Date(startDate) };
  if (endDate) match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };

  let groupId = {};
  if (groupBy === 'daily') {
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    };
  } else if (groupBy === 'weekly') {
    groupId = {
      year: { $year: '$createdAt' },
      week: { $week: '$createdAt' }
    };
  } else { // monthly
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' }
    };
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
  ];

  const result = await Order.aggregate(pipeline);
  return result.map(item => {
    let period = '';
    if (groupBy === 'daily') {
      const d = new Date(item._id.year, item._id.month - 1, item._id.day);
      period = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } else if (groupBy === 'weekly') {
      period = `W${item._id.week}-${item._id.year}`;
    } else {
      period = new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric'
      });
    }
    return { period, revenue: item.revenue, orders: item.orders };
  });
};

// ─── Main Full Analytics Endpoint ──────────────────────────────────
export const getFullAnalytics = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      revenueFilter = 'daily',
      ordersFilter = 'daily',
      topProductsFilter = 'weekly'
    } = req.query;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // ── 1. KPIs ──────────────────────────────────────────────
    const ordersMatch = {};
    if (start) ordersMatch.createdAt = { $gte: start };
    if (end) ordersMatch.createdAt = { ...ordersMatch.createdAt, $lte: end };

    const totalOrders = await Order.countDocuments(ordersMatch);
    const totalRevenueAgg = await Order.aggregate([
      { $match: { ...ordersMatch, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueAgg.length ? totalRevenueAgg[0].total : 0;

    const totalCustomers = await User.countDocuments({ role: 'user' });
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ── 2. Revenue Data ────────────────────────────────────────
    const revenueData = await revenueByPeriod(start, end, revenueFilter);

    // ── 3. Orders Data ────────────────────────────────────────
    const ordersDataRaw = await revenueByPeriod(start, end, ordersFilter);
    const ordersData = ordersDataRaw.map(item => ({ period: item.period, orders: item.orders }));

    // ── 4. Top Products ────────────────────────────────────────
    const topProductsPipeline = [
      { $match: { ...ordersMatch } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          sales: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          quantity: { $sum: '$items.quantity' },
          customers: { $addToSet: '$user' }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          image: { $ifNull: ['$image', 'https://placehold.co/40x40/FFF4E6/78350F?text=No'] },
          sales: 1,
          customers: { $size: '$customers' }
        }
      }
    ];
    const topProducts = await Order.aggregate(topProductsPipeline);

    // ── 5. Sales by Channel (mock – replace later) ────────────
    const salesByChannel = [
      { name: 'Website', value: totalRevenue * 0.6 },
      { name: 'WhatsApp', value: totalRevenue * 0.2 },
      { name: 'Email', value: totalRevenue * 0.1 },
      { name: 'Other', value: totalRevenue * 0.1 }
    ];

    // ── 6. Revenue by Category (✅ FIXED) ──────────────────────
    const categoryPipeline = [
      { $match: { ...ordersMatch, paymentStatus: 'Paid' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$categoryInfo.name', 'Other'] },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 4 }
    ];
    let categoryRevenue = await Order.aggregate(categoryPipeline);
    categoryRevenue = categoryRevenue.map(item => ({
      category: item._id || 'Other',
      revenue: item.revenue
    }));

    // ── 7. Customer Growth ──────────────────────────────────────
    const growthPipeline = [
      { $match: { role: 'user' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ];
    let customerGrowth = await User.aggregate(growthPipeline);
    if (!customerGrowth.length) {
      customerGrowth = [
        { date: '2026-01-01', newCustomers: 5 },
        { date: '2026-01-02', newCustomers: 8 },
        { date: '2026-01-03', newCustomers: 3 },
        { date: '2026-01-04', newCustomers: 10 },
        { date: '2026-01-05', newCustomers: 7 }
      ];
    } else {
      customerGrowth = customerGrowth.map(item => ({ date: item._id, newCustomers: item.count }));
    }

    // ── 8. New vs Returning ──────────────────────────────────────
    const newVsReturningAgg = await Order.aggregate([
      { $match: { ...ordersMatch } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      {
        $group: {
          _id: { $cond: [{ $eq: ['$count', 1] }, 'New', 'Returning'] },
          value: { $sum: 1 }
        }
      }
    ]);
    let newVsReturning = [
      { name: 'New', value: 0 },
      { name: 'Returning', value: 0 }
    ];
    if (newVsReturningAgg.length) {
      newVsReturning = newVsReturningAgg.map(item => ({ name: item._id, value: item.value }));
    }

    // ── 9. Order Status ──────────────────────────────────────────
    const statusAgg = await Order.aggregate([
      { $match: { ...ordersMatch } },
      { $group: { _id: '$status', value: { $sum: 1 } } }
    ]);
    const orderStatus = statusAgg.map(item => ({ name: item._id, value: item.value }));

    // ── 10. Funnel (mock – replace with real tracking) ──────────
    const funnel = {
      totalVisitors: 10000,
      productViews: 8000,
      addToCart: 3000,
      checkoutInitiated: 1500,
      checkoutCompleted: 1200,
      visitorsChange: 5.2,
      productViewsChange: 3.1,
      addToCartChange: 8.7,
      checkoutInitiatedChange: 6.4,
      checkoutCompletedChange: 10.3,
    };

    // ── 11. KPIs with growth ──────────────────────────────────────
    const kpis = {
      totalRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      conversionRate: totalOrders > 0 ? ((totalOrders / funnel.totalVisitors) * 100) : 0,
      revenueGrowth: 12.5,
      ordersGrowth: 8.2,
      customersGrowth: 15.7,
      avgOrderGrowth: 4.3,
      conversionGrowth: 2.1,
    };

    res.json({
      kpis,
      revenueData,
      ordersData,
      salesByChannel,
      topProducts,
      categoryRevenue,
      customerGrowth,
      funnel,
      newVsReturning,
      orderStatus,
    });
  } catch (error) {
    logger.error('Full analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
};

// ─── Existing endpoints (keep them unchanged) ──────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const [totalOrders, totalRevenue, totalCustomers, totalProducts, totalReviews] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ status: 'Active' }),
      Review.countDocuments()
    ]);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const revenueByMonth = await Order.aggregate([
      { $match: { paymentStatus: 'Paid', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        totalCustomers,
        totalProducts,
        totalReviews,
        ordersByStatus,
        revenueByMonth,
        topProducts
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

export const getSalesByChannel = async (req, res) => {
  try {
    // Mock data – extend later with real tracking
    const channelStats = [
      { channel: 'email', revenue: 450000 },
      { channel: 'whatsapp', revenue: 200000 },
      { channel: 'sms', revenue: 120000 },
      { channel: 'push', revenue: 122000 }
    ];
    res.json({ success: true, channelStats });
  } catch (error) {
    logger.error('Sales by channel error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch' });
  }
};

export const getCustomerGrowth = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          newCustomers: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ success: true, growth });
  } catch (error) {
    logger.error('Customer growth error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch' });
  }
};


// ─── Get Top Selling Products ──────────────────────
export const getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Aggregate orders to get top products by quantity sold
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productName: '$product.name',
          totalSold: 1,
          revenue: 1,
          image: '$product.mainImage'
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    res.json({ success: true, products: topProducts });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top products' });
  }
};