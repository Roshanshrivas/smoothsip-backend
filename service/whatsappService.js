import logger from '../utils/logger.js';

/**
 * Mock WhatsApp sender – logs a warning and returns success
 * This will NEVER crash your application.
 */
export const sendWhatsApp = async ({ to, message }) => {
  logger.warn('📵 WhatsApp service is not configured – skipping send');
  logger.debug(`Mock WhatsApp to ${to}: ${message?.slice(0, 50)}...`);

  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    success: true,
    mock: true,
    note: 'WhatsApp service is currently on hold (paid service)',
    sentTo: to || 'mock-recipient',
  };
};