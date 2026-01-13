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
    status: 'active',
    networks: [
      {
        id: 'usdt-bep20-mainnet',
        name: 'BEP20 (BSC Mainnet)',
        network: 'bep20-mainnet',
        isDefault: true,
        minDeposit: '10',
        minimumWithdraw: '5',
        withdrawFee: '1',
        fee: '1',
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: '~5 min',
        contactAddress: '0x55d398326f99059fF775485246999027B3197955',
        rpcUrl: 'https://bsc-dataseed1.binance.org/',
        type: 'BEP20',
        isActive: true
      },
      {
        id: 'usdt-bep20-testnet',
        name: 'BEP20 (BSC Testnet)',
        network: 'bep20-testnet',
        isDefault: false,
        minDeposit: '10',
        minimumWithdraw: '5',
        withdrawFee: '1',
        fee: '1',
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: '~5 min',
        contactAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        type: 'BEP20',
        isActive: true
      }
    ]
  },
  {
    id: 'bnb',
    name: 'Binance Coin',
    symbol: 'BNB',
    icon: '/svg/color/bnb.svg',
    status: 'active',
    networks: [
      {
        id: 'bnb-bep20-mainnet',
        name: 'BEP20 (BSC Mainnet)',
        network: 'bep20-mainnet',
        isDefault: true,
        minDeposit: '0.01',
        minimumWithdraw: '0.005',
        withdrawFee: '0.0005',
        fee: '0.001',
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: '~3 min',
        rpcUrl: 'https://bsc-dataseed1.binance.org/',
        type: 'Native',
        isActive: true
      },
      {
        id: 'bnb-bep20-testnet',
        name: 'BEP20 (BSC Testnet)',
        network: 'bep20-testnet',
        isDefault: false,
        minDeposit: '0.01',
        minimumWithdraw: '0.005',
        withdrawFee: '0.0005',
        fee: '0.001',
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: '~3 min',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        type: 'Native',
        isActive: true
      }
    ]
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '/svg/color/eth.svg',
    status: 'active',
    networks: [
      {
        id: 'eth-erc20-mainnet',
        name: 'ERC20 (Ethereum Mainnet)',
        network: 'erc20-mainnet',
        isDefault: true,
        minDeposit: '0.01',
        minimumWithdraw: '0.005',
        withdrawFee: '0.002',
        fee: '0.002',
        requiresMemo: false,
        confirmations: 12,
        estimatedTime: '~10 min',
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        type: 'Native',
        isActive: true
      }
    ]
  },
  {
    id: 'trx',
    name: 'Tron',
    symbol: 'TRX',
    icon: '/svg/color/trx.svg',
    status: 'active',
    networks: [
      {
        id: 'trx-trc20-mainnet',
        name: 'TRC20 (Tron Mainnet)',
        network: 'trc20-mainnet',
        isDefault: true,
        minDeposit: '10',
        minimumWithdraw: '5',
        withdrawFee: '1',
        fee: '1',
        requiresMemo: false,
        confirmations: 20,
        estimatedTime: '~3 min',
        rpcUrl: 'https://api.trongrid.io',
        type: 'Native',
        isActive: true
      }
    ]
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
