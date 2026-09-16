import Broadcast from '../../models/Broadcast.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { executeBroadcast } from '../../service/broadcastSender.js';

// ─── Helper: Convert MongoDB doc to include `id` ──
const toBroadcastResponse = (broadcast) => {
  const obj = broadcast.toObject ? broadcast.toObject() : broadcast;
  return {
    ...obj,
    id: obj._id.toString(), // Add `id` field
  };
};


export const getBroadcasts = async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort('-createdAt');
    const formatted = broadcasts.map(b => toBroadcastResponse(b));
    res.json({ success: true, broadcasts: formatted });
  } catch (error) {
    logger.error('Get broadcasts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch' });
  }
};

export const getBroadcastById = async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) throw new ApiError(404, 'Broadcast not found');
    res.json({ success: true,  broadcast: toBroadcastResponse(broadcast) });
  } catch (error) {
    logger.error('Get broadcast error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const createBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.create({ ...req.body, createdBy: req.userId });
    logger.info(`Broadcast created: ${broadcast.name}`);
    res.status(201).json({ success: true, broadcast: toBroadcastResponse(broadcast) });
  } catch (error) {
    logger.error('Create broadcast error:', error);
    res.status(500).json({ success: false, message: 'Failed to create' });
  }
};

export const updateBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!broadcast) throw new ApiError(404, 'Broadcast not found');
    res.json({ success: true, broadcast: toBroadcastResponse(broadcast) });
  } catch (error) {
    logger.error('Update broadcast error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deleteBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findByIdAndDelete(req.params.id);
    if (!broadcast) throw new ApiError(404, 'Broadcast not found');
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    logger.error('Delete broadcast error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const sendBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const broadcast = await Broadcast.findById(id);
    if (!broadcast) throw new ApiError(404, 'Broadcast not found');
    if (broadcast.status === 'completed') {
      throw new ApiError(400, 'Broadcast already sent');
    }

     // ✅ Allow resend if previously completed but sent 0 users
    if (broadcast.status === 'completed' && broadcast.sentCount === 0) {
      logger.info(`🔄 Resetting completed-but-unsent broadcast "${broadcast.name}" to draft`);
      broadcast.status = 'draft';
      broadcast.sentCount = 0;
      broadcast.deliveredCount = 0;
      broadcast.sentAt = null;
      await broadcast.save();
    }
    
    // ❌ Still block if actually sent successfully
    if (broadcast.status === 'completed' && broadcast.sentCount > 0) {
      throw new ApiError(400, 'Broadcast already sent successfully');
    }

    // Execute the send
    const result = await executeBroadcast(id);

    res.json({
      success: true,
      message: 'Broadcast sent successfully',
      sentCount: result.sentCount,
      deliveredCount: result.deliveredCount,
    });
  } catch (error) {
    logger.error('Send broadcast error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};


export const getBroadcastStats = async (req, res) => {
  try {
    // Get all broadcasts for aggregation
    const broadcasts = await Broadcast.find();
    const totalCampaigns = broadcasts.length;

    // Calculate total audience reach (sum of audienceCount for all campaigns)
    const totalAudienceReach = broadcasts.reduce((sum, b) => sum + (b.audienceCount || 0), 0);

    // Calculate total messages sent
    const totalSent = broadcasts.reduce((sum, b) => sum + (b.sentCount || 0), 0);

    // Calculate average open rate
    const completedWithOpen = broadcasts.filter(b => b.openCount > 0);
    const avgOpenRate = completedWithOpen.length > 0
      ? Math.round((completedWithOpen.reduce((sum, b) => sum + b.openCount, 0) / 
          completedWithOpen.reduce((sum, b) => sum + b.sentCount, 0)) * 100)
      : 0;

    // Calculate average click rate
    const completedWithClick = broadcasts.filter(b => b.clickCount > 0);
    const avgClickRate = completedWithClick.length > 0
      ? Math.round((completedWithClick.reduce((sum, b) => sum + b.clickCount, 0) / 
          completedWithClick.reduce((sum, b) => sum + b.sentCount, 0)) * 100)
      : 0;

    // Calculate changes (mock for now, can be calculated from previous month)
    // In production, you'd compare with data from previous month
    const campaignChange = totalCampaigns > 0 ? Math.round((totalCampaigns / 100) * 18.6) : 0;
    const reachChange = totalAudienceReach > 0 ? Math.round((totalAudienceReach / 100) * 22.4) : 0;
    const sentChange = totalSent > 0 ? Math.round((totalSent / 100) * 15.8) : 0;
    const openRateChange = avgOpenRate > 0 ? Math.round((avgOpenRate / 100) * 5.2) : 0;
    const clickRateChange = avgClickRate > 0 ? Math.round((avgClickRate / 100) * 2.1) : 0;

    res.json({
      success: true,
      totalCampaigns,
      audienceReach: totalAudienceReach,
      totalSent,
      openRate: avgOpenRate,
      clickRate: avgClickRate,
      campaignChange,
      reachChange,
      sentChange,
      openRateChange,
      clickRateChange,
    });
  } catch (error) {
    logger.error('Get broadcast stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};