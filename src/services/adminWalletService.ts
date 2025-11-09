import AdminWallet, { IAdminWallet, IDepositAddress } from '../models/AdminWallet';
import CryptoCoin, { ICryptoCoin } from '../models/CryptoCoin';

/**
 * Admin Wallet Service
 * Manages admin wallets, private keys, and deposit addresses
 */
export class AdminWalletService {
  private encryptionKey: string;

  constructor() {
    // Get encryption key from environment variable
    this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || '';
    
    if (!this.encryptionKey) {
      console.warn('⚠️ WALLET_ENCRYPTION_KEY not set in environment variables');
    }
  }

  /**
   * Create a new admin wallet with encrypted private key
   * @param coinId - CryptoCoin ID
   * @param coinSymbol - Coin symbol (e.g., 'USDT', 'BTC')
   * @param privateKey - Plain text private key
   * @param depositAddresses - Array of deposit addresses for different networks
   * @returns Created admin wallet
   */
  async createAdminWallet(
    coinId: string,
    coinSymbol: string,
    privateKey: string,
    depositAddresses: Omit<IDepositAddress, 'createdAt'>[]
  ): Promise<IAdminWallet> {
    try {
      // Verify coin exists
      const coin = await CryptoCoin.findOne({ id: coinId });
      if (!coin) {
        throw new Error(`Coin with ID ${coinId} not found`);
      }

      // Validate that all network IDs exist in the coin's networks
      const validNetworkIds = coin.networks.map((network) => network.id);
      for (const addr of depositAddresses) {
        if (!validNetworkIds.includes(addr.networkId)) {
          throw new Error(
            `Network ID ${addr.networkId} not found in coin ${coinSymbol}`
          );
        }
      }

      // Encrypt private key
      const encryptedPrivateKey = (AdminWallet as any).encryptPrivateKey(
        privateKey,
        this.encryptionKey
      );

      // Create admin wallet
      const adminWallet = await AdminWallet.create({
        coinId,
        coinSymbol: coinSymbol.toUpperCase(),
        encryptedPrivateKey,
        depositAddresses: depositAddresses.map((addr) => ({
          ...addr,
          createdAt: new Date(),
        })),
        isActive: true,
      });

      console.log(`✅ Admin wallet created for ${coinSymbol}`);
      return adminWallet;
    } catch (error: any) {
      console.error('❌ Error creating admin wallet:', error.message);
      throw error;
    }
  }

  /**
   * Get admin wallet by coin symbol
   * @param coinSymbol - Coin symbol (e.g., 'USDT', 'BTC')
   * @returns Admin wallet or null
   */
  async getAdminWallet(coinSymbol: string): Promise<IAdminWallet | null> {
    try {
      const wallet = await AdminWallet.findOne({
        coinSymbol: coinSymbol.toUpperCase(),
        isActive: true,
      });
      return wallet;
    } catch (error: any) {
      console.error('❌ Error getting admin wallet:', error.message);
      throw error;
    }
  }

  /**
   * Get deposit address for a specific coin and network
   * @param coinSymbol - Coin symbol (e.g., 'USDT', 'BTC')
   * @param networkId - Network ID (e.g., 'trc20', 'erc20')
   * @returns Deposit address or null
   */
  async getDepositAddress(
    coinSymbol: string,
    networkId: string
  ): Promise<IDepositAddress | null> {
    try {
      const wallet = await this.getAdminWallet(coinSymbol);
      if (!wallet) {
        console.warn(`⚠️ No admin wallet found for ${coinSymbol}`);
        return null;
      }

      const depositAddress = wallet.getDepositAddress(networkId);
      if (!depositAddress) {
        console.warn(
          `⚠️ No deposit address found for ${coinSymbol} on network ${networkId}`
        );
        return null;
      }

      return depositAddress;
    } catch (error: any) {
      console.error('❌ Error getting deposit address:', error.message);
      throw error;
    }
  }

  /**
   * Add or update deposit address for a network
   * @param coinSymbol - Coin symbol
   * @param networkId - Network ID
   * @param address - Deposit address
   * @param memo - Optional memo for networks that require it
   * @returns Updated admin wallet
   */
  async addOrUpdateDepositAddress(
    coinSymbol: string,
    networkId: string,
    address: string,
    memo?: string
  ): Promise<IAdminWallet | null> {
    try {
      const wallet = await this.getAdminWallet(coinSymbol);
      if (!wallet) {
        throw new Error(`No admin wallet found for ${coinSymbol}`);
      }

      // Get coin to validate network and get network name
      const coin = await CryptoCoin.findOne({ id: wallet.coinId });
      if (!coin) {
        throw new Error(`Coin not found for ${coinSymbol}`);
      }

      const network = coin.networks.find((net) => net.id === networkId);
      if (!network) {
        throw new Error(`Network ${networkId} not found for ${coinSymbol}`);
      }

      // Check if address already exists for this network
      const existingIndex = wallet.depositAddresses.findIndex(
        (addr) => addr.networkId === networkId
      );

      if (existingIndex >= 0) {
        // Update existing address
        wallet.depositAddresses[existingIndex].address = address;
        if (memo !== undefined) {
          wallet.depositAddresses[existingIndex].memo = memo;
        }
      } else {
        // Add new address
        wallet.depositAddresses.push({
          networkId,
          networkName: network.name,
          address,
          memo,
          createdAt: new Date(),
        });
      }

      await wallet.save();
      console.log(
        `✅ Deposit address ${existingIndex >= 0 ? 'updated' : 'added'} for ${coinSymbol} on ${network.name}`
      );
      return wallet;
    } catch (error: any) {
      console.error('❌ Error adding/updating deposit address:', error.message);
      throw error;
    }
  }

  /**
   * Get decrypted private key (use with caution!)
   * @param coinSymbol - Coin symbol
   * @returns Decrypted private key
   */
  async getPrivateKey(coinSymbol: string): Promise<string> {
    try {
      // Explicitly select the encrypted private key field
      const wallet = await AdminWallet.findOne({
        coinSymbol: coinSymbol.toUpperCase(),
        isActive: true,
      }).select('+encryptedPrivateKey');

      if (!wallet) {
        throw new Error(`No admin wallet found for ${coinSymbol}`);
      }

      const privateKey = wallet.decryptPrivateKey(this.encryptionKey);
      return privateKey;
    } catch (error: any) {
      console.error('❌ Error getting private key:', error.message);
      throw error;
    }
  }

  /**
   * Get all active admin wallets
   * @returns Array of admin wallets
   */
  async getAllAdminWallets(): Promise<IAdminWallet[]> {
    try {
      // Don't populate coinId since it's a string field, not a reference
      const wallets = await AdminWallet.find({ isActive: true });
      return wallets;
    } catch (error: any) {
      console.error('❌ Error getting all admin wallets:', error.message);
      throw error;
    }
  }

  /**
   * Get all balances across all coins
   * @returns Summary of all balances
   */
  async getAllBalances(): Promise<{
    totalBalanceAllCoins: number;
    wallets: Array<{
      coinSymbol: string;
      coinId: string;
      balance: number;
      lastBalanceUpdate: Date;
    }>;
  }> {
    try {
      const wallets = await AdminWallet.find({ isActive: true });

      let totalBalanceAllCoins = 0;

      const walletsData = wallets.map((wallet) => {
        totalBalanceAllCoins += wallet.balance || 0;

        return {
          coinSymbol: wallet.coinSymbol,
          coinId: wallet.coinId,
          balance: wallet.balance || 0,
          lastBalanceUpdate: wallet.lastBalanceUpdate,
        };
      });

      return {
        totalBalanceAllCoins,
        wallets: walletsData,
      };
    } catch (error: any) {
      console.error('❌ Error getting all balances:', error.message);
      throw error;
    }
  }

  /**
   * Update balance for a coin
   * @param coinSymbol - Coin symbol
   * @param balance - New balance amount
   * @returns Updated wallet
   */
  async updateBalance(
    coinSymbol: string,
    balance: number
  ): Promise<IAdminWallet | null> {
    try {
      const wallet = await this.getAdminWallet(coinSymbol);
      if (!wallet) {
        throw new Error(`No admin wallet found for ${coinSymbol}`);
      }

      // Validate balance
      if (balance < 0) {
        throw new Error('Balance cannot be negative');
      }

      // Update balance
      wallet.balance = balance;
      await wallet.save();

      console.log(
        `✅ Balance updated for ${coinSymbol}: ${balance}`
      );
      return wallet;
    } catch (error: any) {
      console.error('❌ Error updating balance:', error.message);
      throw error;
    }
  }

  /**
   * Get balance for a coin
   * @param coinSymbol - Coin symbol
   * @returns Balance or null
   */
  async getBalance(
    coinSymbol: string
  ): Promise<number | null> {
    try {
      const wallet = await this.getAdminWallet(coinSymbol);
      if (!wallet) {
        return null;
      }

      return wallet.balance || 0;
    } catch (error: any) {
      console.error('❌ Error getting balance:', error.message);
      throw error;
    }
  }

  /**
   * Deactivate an admin wallet
   * @param coinSymbol - Coin symbol
   * @returns Updated wallet
   */
  async deactivateWallet(coinSymbol: string): Promise<IAdminWallet | null> {
    try {
      const wallet = await AdminWallet.findOneAndUpdate(
        { coinSymbol: coinSymbol.toUpperCase() },
        { isActive: false },
        { new: true }
      );

      if (wallet) {
        console.log(`✅ Admin wallet deactivated for ${coinSymbol}`);
      }
      return wallet;
    } catch (error: any) {
      console.error('❌ Error deactivating wallet:', error.message);
      throw error;
    }
  }
}

export default new AdminWalletService();
