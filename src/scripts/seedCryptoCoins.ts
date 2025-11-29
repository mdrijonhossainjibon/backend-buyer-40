import mongoose from 'mongoose';
import CryptoCoin from '../models/CryptoCoin';
import dotenv from 'dotenv';

dotenv.config();

const CRYPTO_COINS_DATA = [
  {
    id: 'usdt',
    name: 'Tether',
    symbol: 'USDT',
    icon: '/svg/color/usdt.svg',
    networks: [
      {
        id: 'bep20-mainnet',
        name: 'BEP20 (BSC Mainnet)',
        isDefault: true,
        minDeposit: '10',
        minimumWithdraw: '5',
        confirmations: 15,
        fee: '1',
        withdrawFee: '1',
        contactAddress: '0x55d398326f99059fF775485246999027B3197955',
        rpcUrl: 'https://bsc-dataseed1.binance.org:8545',
        isActive: true
      },
      {
        id: 'bep20-testnet',
        name: 'BEP20 (BSC Testnet)',
        isDefault: false,
        minDeposit: '10',
        minimumWithdraw: '5',
        confirmations: 15,
        fee: '1',
        withdrawFee: '1',
        contactAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
        rpcUrl: 'https://data-seed-prebsc-1-1.binance.org:8545',
        isActive: true
      }
    ],
    isActive: true
  },
 
  {
    id: 'bnb',
    name: 'Binance Coin',
    symbol: 'BNB',
    icon: '/svg/color/bnb.svg',
    networks: [
      {
        id: 'bsc-mainnet',
        name: 'BSC (Binance Smart Chain)',
        isDefault: true,
        minDeposit: '0.01',
        minimumWithdraw: '0.005',
        confirmations: 15,
        fee: '0.001',
        withdrawFee: '0.0005',
        contactAddress: null,
        rpcUrl: 'https://bsc-dataseed1.binance.org:8545',
        isActive: true
      },
      {
        id: 'bsc-testnet',
        name: 'BSC (Binance Smart Chain Testnet)',
        isDefault: false,
        minDeposit: '0.01',
        minimumWithdraw: '0.005',
        confirmations: 15,
        fee: '0.001',
        withdrawFee: '0.0005',
        contactAddress: null,
        rpcUrl: 'https://data-seed-prebsc-1-1.binance.org:8545',
        isActive: true
      }
    ],
    isActive: true
  },
 
];

async function seedCryptoCoins() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/buyer40';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional)
    await CryptoCoin.deleteMany({});
    console.log('🗑️  Cleared existing crypto coins');

    // Insert new data
    const result = await CryptoCoin.insertMany(CRYPTO_COINS_DATA);
    console.log(`✅ Successfully seeded ${result.length} crypto coins`);

    // Display seeded data
    console.log('\n📊 Seeded Crypto Coins:');
    result.forEach(coin => {
      console.log(`  - ${coin.symbol} (${coin.name}): ${coin.networks.length} networks`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding crypto coins:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCryptoCoins();
