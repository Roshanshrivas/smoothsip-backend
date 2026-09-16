import DeviceToken from '../../models/DeviceToken.js';
import logger from '../../utils/logger.js';

export const savePushToken = async (req, res) => {
  try {
    const { token, deviceInfo } = req.body;
    const userId = req.userId;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required' });
    }

    // Remove existing token (prevent duplicates)
    await DeviceToken.findOneAndDelete({ token });

    await DeviceToken.create({
      userId,
      token,
      deviceInfo: deviceInfo || { platform: 'web' },
      lastUsed: new Date(),
    });

    logger.info(`Push token saved for user ${userId}`);
    res.json({ success: true, message: 'Token saved' });
  } catch (error) {
    logger.error('Save push token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const removePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    await DeviceToken.findOneAndDelete({ token });
    res.json({ success: true, message: 'Token removed' });
  } catch (error) {
    logger.error('Remove push token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};