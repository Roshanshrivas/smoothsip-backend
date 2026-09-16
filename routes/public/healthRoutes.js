// server/routes/public/healthRoutes.js
import express from 'express';
import Settings from '../../models/Settings.js';

const router = express.Router();

// ─── Public maintenance status check ──────────────────
router.get('/maintenance-status', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const maintenance = settings.general?.maintenanceMode || false;
    res.json({
      success: true,
      maintenance,
    });
  } catch (error) {
    console.error('Maintenance status check error:', error);
    res.json({ success: true, maintenance: false });
  }
});

export default router;