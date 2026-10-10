import Product from "../../models/Product.js";

// ─── Escape special regex characters in user input ───
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── TRANSFORM FUNCTION (reusable) ───
const transformProduct = (p) => ({
  id: p._id,
  slug: p.slug || null,
  title: p.name,
  name: p.name,
  price: p.price,
  oldPrice: p.comparePrice || p.price * 1.2,
  discount: p.comparePrice ? Math.round((1 - p.price / p.comparePrice) * 100) : 0,
  image: p.mainImage || (p.images && p.images[0]) || '',
  mainImage: p.mainImage || (p.images && p.images[0]) || '',
  bg: p.bg || '#f8f9fa',
  tags: p.tags || [],
  rating: p.ratingsAverage || 0,
  reviews: p.ratingsCount || 0,
  color: p.color || null,                  // ← use actual field
  material: p.material || 'Stainless Steel', // ← use actual field
  weight: p.weight || 0,                   // ← ADD THIS
  dimensions: p.dimensions || { length: 0, width: 0, height: 0 }, // ← ADD THIS
  inStock: p.stock > 0,
  stock: p.stock,
  sku: p.sku || null,
  categoryId: p.category?._id || null,
  categoryName: p.category?.name || null,
  description: p.description || '',
  features: p.features || [],
  specifications: p.specifications || [],
  images: p.images || [],
  colors: p.colors || [],
  sizes: p.sizes || [],
  isCustomizable: p.isCustomizable || false,
  metaTitle: p.metaTitle || '',
  metaDescription: p.metaDescription || '',
  customizeProductId: p.customizeProductId ? String(p.customizeProductId) : null,
});

// ─── GET PUBLIC PRODUCTS (with full filter support) ───
export const getPublicProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      sort,           // frontend sends this (price_asc, newest, etc.)
      sortBy,         // legacy fallback
      sortOrder,      // legacy fallback
      minPrice,
      maxPrice,
      search,
      tag,            // single tag
      tags,           // comma-separated tags (Quick Filters)
      color,          // comma-separated colors
      material,       // comma-separated materials
      size,           // comma-separated sizes
      inStock,        // 'true' | 'false'
      personalizable, // 'true' | 'false'
    } = req.query;

    const query = { status: 'Active' };
    const conditions = [];

    // ── Category ──
    if (category) query.category = category;

    // ── Tags (single + comma-separated Quick Filters) ──
    if (tag) {
      query.tags = { $in: [new RegExp(`^\\s*${escapeRegex(tag)}\\s*$`, 'i')] };
    } else if (tags) {
      const tagList = String(tags).split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length) {
        query.tags = { $in: tagList.map((t) => new RegExp(`^\\s*${escapeRegex(t)}\\s*$`, 'i')) };
      }
    }

    // ── Price range ──
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // ── Color (case-insensitive, any match) ──
    if (color) {
      const colors = String(color).split(',').map((c) => c.trim()).filter(Boolean);
      if (colors.length) {
         query.color = { $in: colors.map((c) => new RegExp(`^\\s*${escapeRegex(c)}\\s*$`, 'i')) };
      }
    }

    // ── Material (case-insensitive, any match) ──
    if (material) {
      const materials = String(material).split(',').map((m) => m.trim()).filter(Boolean);
      if (materials.length) {
        query.material = { $in: materials.map((m) => new RegExp(`^\\s*${escapeRegex(m)}\\s*$`, 'i')) };
      }
    }

    // ── Size (either `size` string OR `sizes` array) ──
    if (size) {
      const sizeList = String(size).split(',').map((s) => s.trim()).filter(Boolean);
      if (sizeList.length) {
        conditions.push({
          $or: [
            { sizes: { $in: sizeList } },
            { size: { $in: sizeList } },
          ],
        });
      }
    }

    // ── In stock / out of stock ──
    if (inStock === 'true') query.stock = { $gt: 0 };
    if (inStock === 'false') query.stock = { $lte: 0 };

    // ── Personalizable ──
    if (personalizable === 'true') query.isCustomizable = true;
    if (personalizable === 'false') query.isCustomizable = false;

    // ── Search (regex, safe with other $or conditions) ──
    if (search) {
      conditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Combine conditions with $and so search + size can coexist
    if (conditions.length > 0) {
      query.$and = conditions;
    }

    // ── Sort mapping ──
    let finalSort = { createdAt: -1 };
    if (sort) {
      switch (sort) {
        case 'price_asc':
          finalSort = { price: 1 };
          break;
        case 'price_desc':
          finalSort = { price: -1 };
          break;
        case 'newest':
          finalSort = { createdAt: -1 };
          break;
        case 'rating':
          finalSort = { ratingsAverage: -1 };
          break;
        case 'availability':
          finalSort = { stock: -1 };
          break;
        case 'featured':
        default:
          finalSort = { createdAt: -1 };
          break;
      }
    } else {
      // Legacy: sortBy + sortOrder
      const order = sortOrder === 'desc' ? -1 : 1;
      finalSort = { [sortBy || 'createdAt']: order };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .skip(skip)
        .limit(limitNum)
        .sort(finalSort),
      Product.countDocuments(query),
    ]);

    return res.json({
      products: products.map(transformProduct),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

// ─── GET PUBLIC SINGLE PRODUCT ───
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('category', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json(transformProduct(product));
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

// ─── GET AVAILABLE FILTERS (dynamic) ───
export const getAvailableFilters = async (req, res) => {
  try {
    const baseQuery = { status: 'Active' };

    const [colors, materials, tags, sizes] = await Promise.all([
      Product.distinct('color', { ...baseQuery, color: { $ne: '' } }),
      Product.distinct('material', { ...baseQuery, material: { $ne: '' } }),
      Product.distinct('tags', baseQuery),
      Product.distinct('sizes', baseQuery),
    ]);

    // Clean: trim + dedupe + remove empties
    const clean = (arr) =>
      [...new Set(arr.map((v) => String(v).trim()).filter(Boolean))].sort();

    res.json({
      success: true,
      filters: {
        colors: clean(colors),
        materials: clean(materials),
        tags: clean(tags),
        sizes: clean(sizes),
      },
    });
  } catch (error) {
    console.error('Get available filters error:', error);
    res.status(500).json({ success: false, message: 'Failed to load filters' });
  }
};
