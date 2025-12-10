import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ConversionRate from '../models/ConversionRate';
import connectDB from '../config/database';

dotenv.config();

const conversionRates = [
  {
    from: 'xp',
    to: 'usdt',
    rate: 0.0001, // 1 XP = 0.0001 USDT (10,000 XP = 1 USDT)
    minAmount: 100,
    maxAmount: 1000000,
    fee: 2, // 2% fee
    isActive: true,
  },
  {
    from: 'usdt',
    to: 'xp',
    rate: 10000, // 1 USDT = 10,000 XP
    minAmount: 0.1,
    maxAmount: 10000,
    fee: 2, // 2% fee
    isActive: true,
  },
];

async function seedConversionRates() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();

    console.log('🗑️  Clearing existing conversion rates...');
    await ConversionRate.deleteMany({});

    console.log('📝 Creating conversion rates...');
    for (const rate of conversionRates) {
      await ConversionRate.create(rate);
      console.log(`✅ Created rate: ${rate.from.toUpperCase()} → ${rate.to.toUpperCase()} (Rate: ${rate.rate}, Fee: ${rate.fee}%)`);
    }

    console.log('✅ Conversion rates seeded successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding conversion rates:', error.message);
    process.exit(1);
  }
}

seedConversionRates();
