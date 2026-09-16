// cleanupBase64.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const collection = mongoose.connection.db.collection('products');
  const products = await collection.find({}).toArray();

  let cleaned = 0;
  for (const p of products) {
    const hasBase64 =
      (p.images || []).some((img) => typeof img === 'string' && img.startsWith('data:')) ||
      (typeof p.mainImage === 'string' && p.mainImage.startsWith('data:'));

    if (hasBase64) {
      await collection.updateOne(
        { _id: p._id },
        { $set: { images: [], mainImage: '' } }
      );
      console.log(`🧹 Cleared base64 from: ${p.name}`);
      cleaned++;
    }
  }

  console.log(`\n🎉 Cleaned ${cleaned} product(s). Re-upload their images via admin.`);
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});