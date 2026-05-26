const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { HANOI_VENDORS } = require('../data/hanoiKnowledge');
const Vendor = require('../models/Vendor');

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hanomate';

const normalizePriceRange = (vendor) => {
  if (vendor.priceRange) return vendor.priceRange;
  if (vendor.price) return vendor.price;
  return { min: 0, max: 0, unit: 'item' };
};

const buildVendorDocs = () => {
  return HANOI_VENDORS.map((vendor) => ({
    name: vendor.name,
    category: vendor.category,
    address: vendor.address || '',
    rating: vendor.rating || 0,
    priceRange: normalizePriceRange(vendor),
    hours: vendor.hours || '',
    location: vendor.coords && vendor.coords.length === 2 ? {
      type: 'Point',
      coordinates: [vendor.coords[0], vendor.coords[1]],
    } : undefined,
    tips: vendor.tips || '',
    tags: vendor.tags || [],
  }));
};

const run = async () => {
  console.log('🔌 Seed vendors to MongoDB:', uri);
  await mongoose.connect(uri, { autoIndex: false });

  try {
    const docs = buildVendorDocs();
    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { name: { $regex: `^${doc.name}$`, $options: 'i' } },
        update: { $set: doc },
        upsert: true,
      },
    }));

    const result = await Vendor.bulkWrite(ops, { ordered: false });
    console.log(`✅ Seed complete: upserted=${result.upsertedCount}, modified=${result.modifiedCount}`);
  } catch (error) {
    console.error('Seed failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔒 Disconnected from MongoDB');
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
