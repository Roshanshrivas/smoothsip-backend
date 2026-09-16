// server/broadcastSender.js
import Broadcast from '../models/Broadcast.js';
import User from '../models/User.js';
import DeviceToken from '../models/DeviceToken.js';
import { sendEmail } from './emailService.js';
import { sendPushNotification } from '../service/pushService.js';
import { sendSMS } from './smsService.js';
import { sendWhatsApp } from './whatsappService.js';
import logger from '../utils/logger.js';

/**
 * Get users based on audience filter
 */
const getAudienceUsers = async (audienceFilter) => {
  let query = {};

  logger.info(`🔍 Fetching users with filter: "${audienceFilter}"`);

  if (audienceFilter === 'active') {
    query.lastLogin = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  } else if (audienceFilter === 'subscribed') {
    query.isSubscribed = true;
  } else if (audienceFilter === 'inactive') {
    query.lastLogin = { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  } else if (audienceFilter === 'app') {
    // Get users who have at least one device token
    const userIdsWithTokens = await DeviceToken.distinct('userId');
    query._id = { $in: userIdsWithTokens };
  }
  // 'all' or any other value => no filter (returns ALL users)

  const users = await User.find(query).select('_id email');
  logger.info(`✅ Found ${users.length} users for filter "${audienceFilter}"`);
  
  if (users.length > 0) {
    logger.info(`📋 Sample users: ${users.slice(0, 3).map(u => u.email).join(', ')}`);
  }
  
  return users;
};

/**
 * Execute a broadcast (called from controller and cron job)
 */
export const executeBroadcast = async (broadcastId) => {
  const broadcast = await Broadcast.findById(broadcastId);
  if (!broadcast) {
    throw new Error('Broadcast not found');
  }

  // ✅ If already completed, just return
  if (broadcast.status === 'completed') {
    logger.info(`✅ Broadcast "${broadcast.name}" already completed`);
    return { sentCount: broadcast.sentCount, deliveredCount: broadcast.deliveredCount };
  }

  // ✅ If status is 'running', check if it's stuck or just started
  if (broadcast.status === 'running') {
    const now = Date.now();
    const startedAt = new Date(broadcast.updatedAt).getTime();
    const elapsedSeconds = (now - startedAt) / 1000;
    
    // If it's been running for more than 10 seconds, it's probably stuck
    if (elapsedSeconds > 10) {
      logger.warn(`⚠️ Broadcast "${broadcast.name}" stuck in "running" for ${Math.round(elapsedSeconds)}s. Resetting to draft...`);
      broadcast.status = 'draft';
      await broadcast.save();
      // Re-run the function after reset
      return executeBroadcast(broadcastId);
    } else {
      // If it's still within the 10-second window, wait and retry
      logger.info(`⏳ Broadcast "${broadcast.name}" is currently running (${Math.round(elapsedSeconds)}s). Waiting 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Check again after waiting
      return executeBroadcast(broadcastId);
    }
  }

  // Mark as running
  broadcast.status = 'running';
  broadcast.updatedAt = new Date();
  await broadcast.save();

  // Fetch users based on audience filter
  const users = await getAudienceUsers(broadcast.audience);
  logger.info(`👥 Found ${users.length} total users for audience "${broadcast.audience}"`);

  const totalAudience = users.length;
  let sentCount = 0;
  let deliveredCount = 0;

  const channel = broadcast.channel;
  logger.info(`📤 Starting broadcast "${broadcast.name}" (${channel}) to ${totalAudience} users`);

  try {
    switch (channel) {
      case 'email': {
        const emails = users.map(u => u.email).filter(Boolean);
        logger.info(`📧 Found ${emails.length} emails to send`);

        if (emails.length === 0) {
          logger.warn(`⚠️ No emails found for broadcast "${broadcast.name}"`);
          break;
        }

        const batchSize = 50;
        for (let i = 0; i < emails.length; i += batchSize) {
          const batch = emails.slice(i, i + batchSize);
          logger.info(`📧 Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emails.length / batchSize)}`);
          
          await Promise.all(
            batch.map(async (email) => {
              const result = await sendEmail({
                to: email,
                subject: broadcast.subject || 'Message from Tumbler Studio',
                html: `<p>${broadcast.message}</p>`,
              });
              if (result.success) {
                sentCount++;
                deliveredCount++;
              } else {
                sentCount++;
                logger.warn(`📧 Failed to send to ${email}: ${result.error}`);
              }
            })
          );
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        break;
      }

      case 'push': {
        const userIds = users.map(u => u._id);
        logger.info(`📱 Looking for DeviceTokens for ${userIds.length} users`);
        
        const tokens = await DeviceToken.find(
          { userId: { $in: userIds } },
          { token: 1, _id: 0 }
        ).distinct('token');

        logger.info(`📱 Found ${tokens.length} push tokens`);

        if (tokens.length === 0) {
          logger.warn(`⚠️ No push tokens found for broadcast "${broadcast.name}"`);
          break;
        }

        const batchSize = 100;
        let totalSuccesses = 0;
        let totalFailures = 0;

        for (let i = 0; i < tokens.length; i += batchSize) {
          const batch = tokens.slice(i, i + batchSize);
          logger.info(`📱 Sending push batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokens.length / batchSize)}`);
          
          const result = await sendPushNotification({
            tokens: batch,
            title: broadcast.name,
            body: broadcast.message,
            data: { campaignId: broadcast._id.toString() },
          });
          
          totalSuccesses += result.successes || 0;
          totalFailures += result.failures || 0;
          logger.info(`📱 Batch result: ${result.successes} successes, ${result.failures} failures`);
        }
        
        sentCount = totalSuccesses;
        deliveredCount = totalSuccesses;
        break;
      }

      case 'sms': {
        logger.info(`📱 SMS: Mock send to ${totalAudience} users`);
        await sendSMS({ to: 'all-users', message: broadcast.message });
        sentCount = totalAudience;
        deliveredCount = totalAudience;
        break;
      }

      case 'whatsapp': {
        logger.info(`💬 WhatsApp: Mock send to ${totalAudience} users`);
        await sendWhatsApp({ to: 'all-users', message: broadcast.message });
        sentCount = totalAudience;
        deliveredCount = totalAudience;
        break;
      }

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }

    // Update broadcast with results
     if ((channel === 'email' || channel === 'push') && sentCount === 0) {
      broadcast.status = 'draft';
      broadcast.sentAt = null; // clear sent time
      broadcast.sentCount = 0;
      broadcast.deliveredCount = 0;
      await broadcast.save();
      logger.warn(`⚠️ Broadcast "${broadcast.name}" sent 0 messages (no valid recipients/tokens). Status set to 'draft' for retry.`);
    } else {
      broadcast.sentAt = new Date();
      broadcast.sentCount = sentCount;
      broadcast.deliveredCount = deliveredCount;
      broadcast.status = 'completed';
      await broadcast.save();
      logger.info(`✅ Broadcast "${broadcast.name}" completed. Sent: ${sentCount}, Delivered: ${deliveredCount}`);
    }
    return { sentCount, deliveredCount };
  } catch (error) {
    // On failure, set status to 'failed' so admin can retry
    broadcast.status = 'failed';
    await broadcast.save();
    logger.error(`❌ Broadcast "${broadcast.name}" failed:`, error.message);
    logger.error(`❌ Stack trace:`, error.stack);
    throw error;
  }
};