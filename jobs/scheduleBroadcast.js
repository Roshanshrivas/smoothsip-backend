import cron from 'node-cron';
import Broadcast from '../models/Broadcast.js';
import { executeBroadcast } from '../service/broadcastSender.js';
import logger from '../utils/logger.js';

export const startScheduledBroadcastProcessor = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const dueBroadcasts = await Broadcast.find({
        status: 'scheduled',
        scheduledDate: { $lte: now },
      });
      for (const broadcast of dueBroadcasts) {
        logger.info(`Processing scheduled broadcast: ${broadcast.name}`);
        await executeBroadcast(broadcast._id);
      }
    } catch (error) {
      logger.error('Scheduled broadcast processor error:', error);
    }
  });
};