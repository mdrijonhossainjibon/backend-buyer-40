/**
 * Seed script to create admin wallets (Hot Wallets)
 * Run this script to initialize admin wallets
 * 
 * Usage: ts-node src/scripts/seedAdminWallet.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateHotWallet } from 'auth-fingerprint';
import AdminWallet from '../models/AdminWallet';
import connectDB from 'config/database';

dotenv.config();

async function seedAdminWallets() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check if wallet already exists
    const existingWallet = await AdminWallet.findOne({ status: 'active' });
    if (existingWallet) {
      console.log('⚠️ Active admin wallet already exists:', existingWallet.address);
      console.log('   Supported networks:', existingWallet.supportedNetworks.join(', '));
      return;
    }

    // Generate hot wallet
    console.log('\n🔑 Generating hot wallet...');
    const hotWallet = generateHotWallet();
    
    if (!hotWallet.mnemonic || !hotWallet.address || !hotWallet.privateKey) {
      throw new Error('Failed to generate hot wallet');
    }

    console.log(' Address:', hotWallet.address);
    console.log('� Mnemonic:', hotWallet.mnemonic.phrase);

    // Create admin wallet
    const adminWallet = new AdminWallet({   
      mnemonic: hotWallet.mnemonic.phrase,
      privateKey: hotWallet.privateKey,
      address: hotWallet.address,
      status: 'active',
      supportedNetworks: [
        'erc20-mainnet',
        'bep20-mainnet',
        'polygon-mainnet',
        'arbitrum-mainnet',
        'sepolia',
        'bsc-testnet'
      ]
    });

    await adminWallet.save();

    console.log('\n✅ Admin wallet created successfully!');
    console.log('   Address:', adminWallet.address);
    console.log('   Status:', adminWallet.status);
    console.log('   Supported Networks:', adminWallet.supportedNetworks.join(', '));

    // List all wallets
    console.log('\n📋 All admin wallets:');
    const allWallets = await AdminWallet.find({});
    allWallets.forEach((wallet, index) => {
      console.log(`\n${index + 1}. ${wallet.address}`);
      console.log(`   Status: ${wallet.status}`);
      console.log(`   Networks: ${wallet.supportedNetworks.join(', ')}`);
    });

    console.log('\n✅ Seed completed successfully!');
  } catch (error: any) {
    console.error('❌ Error seeding admin wallets:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedAdminWallets();
