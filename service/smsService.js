import logger from '../utils/logger.js';

/**
 * Mock SMS sender – logs a warning and returns success
 * This will NEVER crash your application.
 */
export const sendSMS = async ({ to, message }) => {
  logger.warn('📵 SMS service is not configured – skipping send');
  logger.debug(`Mock SMS to ${to}: ${message?.slice(0, 50)}...`);

  // Simulate a small delay to mimic real API
  await new Promise(resolve => setTimeout(resolve, 100));

  // Always return success – this keeps the broadcast flow happy
  return {
    success: true,
    mock: true,
    note: 'SMS service is currently on hold (paid service)',
    sentTo: to || 'mock-recipient',
  };
};