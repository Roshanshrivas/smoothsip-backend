// server/routes/sitemap.js
import express from 'express';
import { SitemapStream, streamToPromise } from 'sitemap';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    // ─── Get hostname from env or use fallback ──────
    const hostname = process.env.CLIENT_URL || 'https://yourdomain.com';

    // ─── Fetch all products and categories ──────────
    const [products, categories] = await Promise.all([
      Product.find().select('slug updatedAt'),
      Category.find().select('slug updatedAt'),
    ]);

    // ─── Build sitemap links ─────────────────────────
    const links = [
      // Static pages
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/about', changefreq: 'monthly', priority: 0.5 },
      { url: '/contact', changefreq: 'monthly', priority: 0.5 },
      { url: '/allproducts', changefreq: 'weekly', priority: 0.8 },
      
      // Categories
      ...categories.map(cat => ({
        url: `/categories/${cat.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: cat.updatedAt,
      })),
      
      // Products
      ...products.map(product => ({
        url: `/product/${product.slug || product._id}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: product.updatedAt,
      })),
    ];

    // ─── Generate XML ──────────────────────────────────
    const stream = new SitemapStream({ hostname });
    res.header('Content-Type', 'application/xml');
    
    // Write all links to stream
    links.forEach(link => stream.write(link));
    stream.end();

    // Pipe to response
    const data = await streamToPromise(stream);
    res.send(data);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).end();
  }
});

export default router;