import express from 'express';
import { getActiveBanners } from '../../controllers/admin/bannerController.js';

const router = express.Router();
router.get('/active', getActiveBanners);

export default router;