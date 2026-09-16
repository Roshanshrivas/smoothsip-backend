import Settings from '../../models/Settings.js';
import logger from '../../utils/logger.js';

// ─── Get all settings ──────────────────────────────
export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};


// ─── Update settings (full or partial) ─────────────
export const updateSettings = async (req, res) => {
  try {
    const { general, email, sms, seo, security, backup } = req.body;
    const settings = await Settings.getSettings();

    // Update only provided sections
    if (general) settings.general = { ...settings.general, ...general };
    if (email) settings.email = { ...settings.email, ...email };
    if (sms) settings.sms = { ...settings.sms, ...sms };
    if (seo) settings.seo = { ...settings.seo, ...seo };
    if (security) settings.security = { ...settings.security, ...security };
    if (backup) settings.backup = { ...settings.backup, ...backup };

    await settings.save();
    logger.info('Settings updated by admin');
    res.json({ success: true, message: 'Settings updated', settings });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};


// ─── Reset all settings to defaults ────────────────
export const resetSettings = async (req, res) => {
  try {
    // Delete the existing document; next getSettings will create a new one with defaults
    await Settings.findOneAndDelete({});
    const newSettings = await Settings.create({});
    logger.info('Settings reset to defaults');
    res.json({ success: true, message: 'Settings reset', settings: newSettings });
  } catch (error) {
    logger.error('Reset settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset settings' });
  }
};


// ─── Test Email ──────────────────────────────
export const testEmail = async (req, res) => {
  try {
    const { email, settings } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    
    // Send test email
    const result = await sendEmail({
      to: email,
      subject: 'Test Email from Tumbler Studio',
      html: `
        <h1>✅ Test Email</h1>
        <p>This is a test email from your Tumbler Studio store.</p>
        <p>Your email settings are working correctly!</p>
        <hr>
        <p style="color: #64748b; font-size: 14px;">
          Sent at: ${new Date().toLocaleString()}
        </p>
      `,
      text: 'This is a test email from Tumbler Studio. Your email settings are working correctly!',
    });
    
    if (result.success) {
      logger.info(`Test email sent to ${email}`);
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to send test email' });
    }
  } catch (error) {
    logger.error('Test email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};