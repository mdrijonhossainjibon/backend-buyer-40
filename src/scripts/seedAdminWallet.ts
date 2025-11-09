/**
 * Seed script to create admin wallets
 * Run this script to initialize admin wallets with deposit addresses
 * 
 * Usage: ts-node src/scripts/seedAdminWallet.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
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

    // Create admin wallet with your actual private key and addresses
    const usdtWallet = await adminWalletService.createAdminWallet(
      usdtCoin.id,
      'USDT',
      'YOUR_PRIVATE_KEY_HERE', // Replace with actual private key
      [
        {
          networkId: 'bep20-mainnet',
          networkName: 'BEP20 (BSC Mainnet)',
          address: 'YOUR_BEP20_ADDRESS_HERE', // Replace with actual address
        },
        {
          networkId: 'erc20-mainnet',
          networkName: 'ERC20 (Ethereum)',
          address: 'YOUR_ERC20_ADDRESS_HERE', // Replace with actual address
        },
        {
          networkId: 'trc20-mainnet',
          networkName: 'TRC20 (TRON)',
          address: 'YOUR_TRC20_ADDRESS_HERE', // Replace with actual address
        },
        // Add more networks as needed
      ]
    );

    console.log('✅ USDT admin wallet created:', usdtWallet.coinSymbol);

    // Initialize balance (optional - set to 0 or actual balance)
    console.log('\n💰 Initializing balance...');
    
    // Set initial balance for the coin (shared across all networks)
    await adminWalletService.updateBalance('USDT', 0);
    console.log('  ✅ USDT balance initialized: 0');
 
    // List all created wallets with addresses
    console.log('\n📋 All admin wallets:');
    const allWallets = await adminWalletService.getAllAdminWallets();
    allWallets.forEach((wallet) => {
      console.log(`\n${wallet.coinSymbol}:`);
      wallet.depositAddresses.forEach((addr) => {
        console.log(`  - ${addr.networkName}: ${addr.address}`);
      });
    });

    // Show all balances summary
    console.log('\n💰 Balances Summary:');
    const balancesData = await adminWalletService.getAllBalances();
    console.log(`Total Balance (All Coins): ${balancesData.totalBalanceAllCoins}`);
    
    balancesData.wallets.forEach((wallet) => {
      console.log(`\n${wallet.coinSymbol}: ${wallet.balance}`);
      console.log(`  Last updated: ${wallet.lastBalanceUpdate}`);
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
