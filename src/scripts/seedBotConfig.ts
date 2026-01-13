/**
 * Seed script to create bot configuration
 * Run this script to initialize bot configuration in database
 * 
 * Usage: ts-node src/scripts/seedBotConfig.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BotConfig } from '../models/BotConfig';
import connectDB from '../config/database';

dotenv.config();

async function seedBotConfig() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check if bot config already exists
    const existingConfig = await BotConfig.findOne();
    if (existingConfig) {
      console.log('⚠️ Bot configuration already exists');
      console.log('   Bot Username:', existingConfig.botUsername);
      console.log('   Bot Status:', existingConfig.botStatus);
      console.log('   Bot Version:', existingConfig.botVersion);
      return;
    }

    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not found in environment variables');
    }

    // Extract bot username from token (format: botId:token)
    const botId = botToken.split(':')[0];
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || `bot_${botId}`;

    console.log('\n🤖 Creating bot configuration...');
    console.log('   Bot Username:', botUsername);

    // Create bot configuration
    const botConfig = new BotConfig({
      botToken: botToken,
      botUsername: botUsername,
      botStatus: 'online',
      botVersion: 'v2.1.0',
      botLastSeen: new Date()
    });

    await botConfig.save();

    console.log('\n✅ Bot configuration created successfully!');
    console.log('   Bot Username:', botConfig.botUsername);
    console.log('   Bot Status:', botConfig.botStatus);
    console.log('   Bot Version:', botConfig.botVersion);
    console.log('   Created At:', botConfig.createdAt);

    console.log('\n✅ Seed completed successfully!');
  } catch (error: any) {
    console.error('❌ Error seeding bot configuration:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedBotConfig();
