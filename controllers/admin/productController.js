import { v2 as cloudinary } from 'cloudinary';
import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';


// ─── Extract public_id from Cloudinary URL ───
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[a-zA-Z0-9]+)?$/);
  return match ? match[1].replace(/\.[^.]+$/, '') : null;
};

// ─── Delete list of Cloudinary images silently ───
const deleteCloudinaryImages = async (urls = []) => {
  const publicIds = urls.map(extractPublicId).filter(Boolean);
  if (publicIds.length === 0) return;
  try {
    await cloudinary.api.delete_resources(publicIds, { resource_type: 'image' });
    logger.info(`Deleted ${publicIds.length} Cloudinary image(s)`);
  } catch (err) {
    logger.error('Cloudinary delete error:', err.message);
  }
};


// ─── Helper: resolve category name to ObjectId ───
const resolveCategory = async (categoryName) => {
  if (!categoryName) return null;
  if (categoryName.match(/^[0-9a-fA-F]{24}$/)) {
    return categoryName;
  }
  // Otherwise find category by name
  let category = await Category.findOne({ name: categoryName });
  if (!category) {
    // ─── Auto-create the category ───
    const slug = categoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    category = await Category.create({
      name: categoryName,
      slug,
      status: 'Active',
    });
    logger.info(`Auto-created category: ${categoryName}`);
  }
  return category._id;
};

// ─── Helper: auto-generate unique SKU ─────────────
const generateSKU = async () => {
  // Get the last product with a TMB-XXXXX format SKU
  const lastProduct = await Product
    .findOne({ sku: /^TMB-\d{5}$/ })
    .sort({ sku: -1 })
    .select('sku');

  let nextNumber = 1;
  if (lastProduct?.sku) {
    const match = lastProduct.sku.match(/TMB-(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }

  // Ensure uniqueness
  let sku = `TMB-${String(nextNumber).padStart(5, '0')}`;
  while (await Product.findOne({ sku })) {
    nextNumber++;
    sku = `TMB-${String(nextNumber).padStart(5, '0')}`;
  }
  return sku;
};

// ─── Helper: normalize dimensions (string → object) ─
const normalizeDimensions = (dim) => {
  if (!dim) return undefined;
  if (typeof dim === 'object') return dim;
  if (typeof dim === 'string') {
    const parts = dim.match(/\d+(\.\d+)?/g);
    if (parts?.length >= 3) {
      return {
        length: Number(parts[0]),
        width: Number(parts[1]),
        height: Number(parts[2]),
      };
    }
  }
  return undefined;
};

// ─── Helper: normalize weight ──
const normalizeWeightToGrams = (value, unit = 'kg') => {
  if (value === undefined || value === null || value === '') return 0;
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;

  // Convert to grams
  if (unit === 'kg') return Math.round(num * 1000);
  return Math.round(num); // already in grams
};

// ─── CREATE PRODUCT ───────────────────────────────
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Resolve category
    if (productData.category) {
      productData.category = await resolveCategory(productData.category);
    }

    // SKU ─── Always Auto-generate ───
   if (!productData.sku || !String(productData.sku).trim()) {
      productData.sku = await generateSKU();
      logger.info(`Auto-generated SKU: ${productData.sku}`);
    } else {
      // If admin manually provided SKU (future-proofing)
      productData.sku = String(productData.sku).trim().toUpperCase();
      const existing = await Product.findOne({ sku: productData.sku });
      if (existing) throw new ApiError(400, `SKU "${productData.sku}" already exists.`);
    }

    // Barcode – optional, keep empty if not provided
    if (productData.barcode && String(productData.barcode).trim()) {
      productData.barcode = String(productData.barcode).trim();
      const existingBarcode = await Product.findOne({ barcode: productData.barcode });
      if (existingBarcode) throw new ApiError(400, `Barcode already exists.`);
    } else {
      delete productData.barcode;
    }

    // ─── Set mainImage from images[0] if not set ───
    if (!productData.mainImage && productData.images?.length > 0) {
      productData.mainImage = productData.images[0];
    }

    // Normalize dimensions + weight
    productData.dimensions = normalizeDimensions(productData.dimensions);
    productData.weight = normalizeWeightToGrams(
      productData.weight,
      productData.weightUnit || 'kg'
    );
    delete productData.weightUnit;

     // Ensure tags is array
    if (!Array.isArray(productData.tags)) productData.tags = [];

    // Default status
    if (!productData.status) productData.status = 'Draft';

    const product = await Product.create(productData);
    res.status(201).json({ success: true, product });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed',
    });
  }
};

// ─── GET ALL PRODUCTS (admin) ─────────────────────
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, minPrice, maxPrice, status } = req.query;
    const query = {};
    if (search) query.$text = { $search: search };
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.category = cat._id;
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (status) query.status = status;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).populate('category').skip(skip).limit(Number(limit)).sort('-createdAt'),
      Product.countDocuments(query)
    ]);

    const statsQuery = { ...query };
    delete statsQuery.status;

    // Also, we need to compute low stock (stock > 0 and <= 10) and out of stock separately
    const totalActive = await Product.countDocuments({ ...statsQuery, status: 'Active' });
    const totalDraft = await Product.countDocuments({ ...statsQuery, status: 'Draft' });
    const totalOutOfStock = await Product.countDocuments({ ...statsQuery, stock: 0 });
    const totalLowStock = await Product.countDocuments({ ...statsQuery, stock: { $gt: 0, $lte: 10 } });

    res.json({
      success: true,
      products,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      stats: {
        totalActive,
        totalDraft,
        totalOutOfStock,
        totalLowStock,
      },
    });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

// ─── GET SINGLE PRODUCT ───────────────────────────
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) throw new ApiError(404, 'Product not found');
    res.json({ success: true, product });
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE PRODUCT ───────────────────────────────
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.category) {
      updates.category = await resolveCategory(updates.category);
    }

    // SKU handling
    if (updates.sku !== undefined) {
      if (!String(updates.sku).trim()) {
        delete updates.sku; // keep existing
      } else {
        updates.sku = String(updates.sku).trim().toUpperCase();
        const existing = await Product.findOne({
          sku: updates.sku,
          _id: { $ne: id },
        });
        if (existing)
          throw new ApiError(400, `SKU "${updates.sku}" already exists.`);
      }
    }

    // Barcode handling
    if (updates.barcode !== undefined) {
      if (!String(updates.barcode).trim()) {
        updates.barcode = undefined;
      } else {
        updates.barcode = String(updates.barcode).trim();
        const existing = await Product.findOne({
          barcode: updates.barcode,
          _id: { $ne: id },
        });
        if (existing) throw new ApiError(400, `Barcode already exists.`);
      }
    }

    if (!updates.mainImage && updates.images?.length > 0) {
      updates.mainImage = updates.images[0];
    }

    updates.dimensions = normalizeDimensions(updates.dimensions);

    // For updateProduct
    if (updates.weight !== undefined) {
      updates.weight = normalizeWeightToGrams(
        updates.weight,
        updates.weightUnit || "kg",
      );
      delete updates.weightUnit;
    }

    // ─── Handle removed images: delete them from Cloudinary ───
    if (updates.images !== undefined) {
      const existing = await Product.findById(id).select('images mainImage');
      if (existing) {
        const oldImages = new Set([
          ...(existing.images || []),
          existing.mainImage,
        ].filter(Boolean));

        const newImages = new Set([
          ...(updates.images || []),
          updates.mainImage,
        ].filter(Boolean));

        const removed = [...oldImages].filter((img) => !newImages.has(img));
        if (removed.length > 0) {
          await deleteCloudinaryImages(removed);
        }
      }
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("category");

    if (!product) throw new ApiError(404, "Product not found");

    res.json({ success: true, product });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── DELETE PRODUCT ──────────────────────────────
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new ApiError(404, 'Product not found');

    // ─── Delete all product images from Cloudinary first ───
    const allImages = [
      ...(product.images || []),
      product.mainImage,
    ].filter(Boolean);

    await deleteCloudinaryImages([...new Set(allImages)]);

    // ─── Then delete from DB ───
    await Product.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Product and its images deleted' });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE STOCK ─────────────────────────────────
export const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true });
    if (!product) throw new ApiError(404, 'Product not found');
    res.json({ success: true, product });
  } catch (error) {
    logger.error('Update stock error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};