/**
 * Seed script to create admin wallets
 * Run this script to initialize admin wallets with deposit addresses
 * 
 * Usage: ts-node src/scripts/seedAdminWallet.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateHotWallet } from 'auth-fingerprint';
import adminWalletService from '../services/adminWalletService';
import CryptoCoin from '../models/CryptoCoin';
import connectDB from 'config/database';

dotenv.config();

async function seedAdminWallets() {
  try {
    // Connect to MongoDB

     await connectDB()
    console.log('✅ Connected to MongoDB');
 
    // Example: Create USDT admin wallet
    console.log('\n📝 Creating USDT admin wallet...');
    
    // First, ensure USDT coin exists in CryptoCoin collection
    const usdtCoin = await CryptoCoin.findOne({ symbol: 'USDT' });
    
    if (!usdtCoin) {
      console.log('⚠️ USDT coin not found in database. Please create it first.');
      return;
    }

    // Log available networks
    console.log('Available networks:', usdtCoin.networks.map(n => n.id).join(', '));

    // Generate hot wallet (one mnemonic for all networks)
    const hotWallet = generateHotWallet();
    
    if (!hotWallet.mnemonic || !hotWallet.address || !hotWallet.privateKey) {
      throw new Error('Failed to generate hot wallet');
    }
    
    console.log('🔑 Generated Mnemonic:', hotWallet.mnemonic.phrase);
    console.log('📍 Default Address:', hotWallet.address);
    console.log('🔐 Default Private Key:', hotWallet.privateKey);

    // Create admin wallet with one mnemonic and different addresses per network
    const usdtWallet = await adminWalletService.createAdminWallet(
      usdtCoin.id,
      'USDT',
      hotWallet.mnemonic.phrase, // Use generated mnemonic
      [
        {
          networkId: 'bep20-mainnet',
          networkName: 'BEP20 (BSC Mainnet)',
          address: hotWallet.address, // Use generated address for BSC
          privateKey: hotWallet.privateKey, // Network-specific private key
        },
        {
          networkId: 'erc20-mainnet',
          networkName: 'ERC20 (Ethereum)',
          address: hotWallet.address, // Same address works for ERC20
          privateKey: hotWallet.privateKey, // Same private key
        },
        // Add more networks as needed
        // For different blockchains (TRX, SOL), you'd derive different addresses from the mnemonic
      ]
    );

    console.log('\n✅ USDT admin wallet created:', usdtWallet.symbol);
    console.log('   Mnemonic stored securely (not shown here)');

    // Initialize balance (optional - set to 0 or actual balance)
    console.log('\n💰 Initializing balance...');
    
    // Set initial balance for the coin (shared across all networks)
    await adminWalletService.updateBalance('USDT', 0);
    console.log('  ✅ USDT balance initialized: 0');
 
    // List all created wallets with addresses
    console.log('\n📋 All admin wallets:');
    const allWallets = await adminWalletService.getAllAdminWallets();
    allWallets.forEach((wallet) => {
      console.log(`\n${wallet.symbol}:`);
      wallet.depositAddresses.forEach((addr) => {
        console.log(`  - ${addr.networkName}: ${addr.address}`);
      });
    });

    // Show all balances summary
    console.log('\n💰 Balances Summary:');
    const balancesData = await adminWalletService.getAllBalances();
   
 

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
