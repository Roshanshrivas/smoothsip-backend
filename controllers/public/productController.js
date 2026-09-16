import Product from "../../models/Product.js";

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
});


// ─── GET PUBLIC PRODUCTS (list) ───
export const getPublicProducts = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, category, sortBy = 'createdAt', sortOrder = 'desc',
      minPrice, maxPrice, search, tag,
    } = req.query;

    const query = { status: 'Active' };
    if (tag) query.tags = { $in: [tag] };
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) query.$text = { $search: search };

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .skip(skip)
      .limit(Number(limit))
      .sort(sortOptions);

    const total = await Product.countDocuments(query);

    res.json({
      products: products.map(transformProduct),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
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
