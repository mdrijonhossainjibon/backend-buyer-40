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
        confirmations: 15,
        fee: '1',
        isActive: true
      },
      {
        id: 'erc20-mainnet',
        name: 'ERC20 (Ethereum)',
        isDefault: false,
        minDeposit: '50',
        confirmations: 12,
        fee: '15',
        isActive: true
      },
      {
        id: 'trc20-mainnet',
        name: 'TRC20 (TRON)',
        isDefault: false,
        minDeposit: '10',
        confirmations: 15,
        fee: '1',
        requiresMemo: true,
        isActive: true
      }
    ],
    isActive: true,
    order: 1
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '/svg/color/btc.svg',
    networks: [
      {
        id: 'btc-mainnet',
        name: 'Bitcoin (Mainnet)',
        isDefault: true,
        minDeposit: '0.001',
        confirmations: 1,
        fee: '0.0005',
        isActive: true
      }
    ],
    isActive: true,
    order: 2
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '/svg/color/eth.svg',
    networks: [
      {
        id: 'eth-mainnet',
        name: 'Ethereum (Mainnet)',
        isDefault: true,
        minDeposit: '0.01',
        confirmations: 12,
        fee: '0.005',
        isActive: true
      }
    ],
    isActive: true,
    order: 3
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
        confirmations: 15,
        fee: '0.001',
        isActive: true
      }
    ],
    isActive: true,
    order: 4
  },
  {
    id: 'trx',
    name: 'TRON',
    symbol: 'TRX',
    icon: '/svg/color/trx.svg',
    networks: [
      {
        id: 'tron-mainnet',
        name: 'Tron (Mainnet)',
        isDefault: true,
        minDeposit: '10',
        confirmations: 15,
        fee: '1',
        isActive: true
      }
    ],
    isActive: true,
    order: 5
  }
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
