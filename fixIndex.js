// fixIndex.js (put in backend root, run: node fixIndex.js)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const collection = mongoose.connection.db.collection('products');
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:');
    indexes.forEach((i) => console.log('  -', i.name));

    // Drop old non-sparse indexes
    for (const name of ['sku_1', 'slug_1', 'barcode_1']) {
      const exists = indexes.find((i) => i.name === name);
      if (exists) {
        await collection.dropIndex(name);
        console.log(`🗑️  Dropped ${name}`);
      }
    }

    // Recreate as sparse unique
    await collection.createIndex({ sku: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ barcode: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ slug: 1 }, { unique: true, sparse: true });

    console.log('🎉 Index fix complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

run();