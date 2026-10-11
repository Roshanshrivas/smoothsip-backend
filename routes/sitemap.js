// routes/sitemap.js
import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import logger from '../utils/logger.js';

const router = express.Router();

const BASE_URL = 'https://smoothsip.in';

// ─────────────────────────────────────────────────────
// Static pages (only PUBLIC pages that should be indexed)
// ─────────────────────────────────────────────────────
const STATIC_PAGES = [
  { path: '/',                 priority: 1.0, changefreq: 'daily'   },
  { path: '/allproducts',      priority: 0.9, changefreq: 'daily'   },
  { path: '/customize',        priority: 0.8, changefreq: 'weekly'  },
  { path: '/about',            priority: 0.5, changefreq: 'monthly' },
  { path: '/contact',          priority: 0.5, changefreq: 'monthly' },
  { path: '/privacy-policy',   priority: 0.3, changefreq: 'yearly'  },
  { path: '/terms-of-service', priority: 0.3, changefreq: 'yearly'  },
  { path: '/refund-policy',    priority: 0.3, changefreq: 'yearly'  },
  { path: '/shipping-policy',    priority: 0.3, changefreq: 'yearly'  },
  { path: '/track-order',      priority: 0.4, changefreq: 'monthly' },
];

// ─────────────────────────────────────────────────────
// XML escape helper — prevents breaking on special chars
// ─────────────────────────────────────────────────────
const escapeXml = (str = '') =>
  String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');

// ─────────────────────────────────────────────────────
// Build a single <url> entry
// ─────────────────────────────────────────────────────
const buildUrlEntry = ({ loc, lastmod, changefreq, priority }) => `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

// ─────────────────────────────────────────────────────
// GET /sitemap.xml — dynamic generation
// ─────────────────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  try {
    const now = new Date().toISOString();

    // ── 1. Static pages ──
    const staticXml = STATIC_PAGES.map((p) =>
      buildUrlEntry({
        loc: `${BASE_URL}${p.path}`,
        lastmod: now,
        changefreq: p.changefreq,
        priority: p.priority.toFixed(1),
      })
    ).join('');

    // ── 2. Active products ──
    let productXml = '';
    try {
      const products = await Product.find({ status: 'Active' })
        .select('_id updatedAt')
        .sort('-updatedAt')
        .lean();

      productXml = products
        .map((p) =>
          buildUrlEntry({
            loc: `${BASE_URL}/product/${p._id}`,
            lastmod: p.updatedAt
              ? new Date(p.updatedAt).toISOString()
              : now,
            changefreq: 'weekly',
            priority: '0.8',
          })
        )
        .join('');
    } catch (err) {
      logger.error('Sitemap: product fetch failed', err);
    }

    // ── 3. Active categories ──
    let categoryXml = '';
    try {
      const categories = await Category.find({ status: 'Active' })
        .select('slug updatedAt')
        .sort('-updatedAt')
        .lean();

      categoryXml = categories
        .map((c) =>
          buildUrlEntry({
            loc: `${BASE_URL}/category/${c.slug}`,
            lastmod: c.updatedAt
              ? new Date(c.updatedAt).toISOString()
              : now,
            changefreq: 'weekly',
            priority: '0.9',
          })
        )
        .join('');
    } catch (err) {
      logger.error('Sitemap: category fetch failed', err);
    }

    // ── 4. Combine ──
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticXml}${categoryXml}${productXml}
</urlset>`;

    // ── 5. Send with cache headers ──
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600'); // 1 hour
    res.send(sitemap);
  } catch (err) {
    logger.error('Sitemap generation failed:', err);
    res.status(500).header('Content-Type', 'text/plain').send('Failed to generate sitemap');
  }
});

// ─────────────────────────────────────────────────────
// GET /sitemap-index.xml — for future scaling (>50k URLs)
// Only needed when product count exceeds 50,000
// ─────────────────────────────────────────────────────
router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const now = new Date().toISOString();

    const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(index);
  } catch (err) {
    res.status(500).send('Failed to generate sitemap index');
  }
});

export default router;