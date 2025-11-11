import crypto from 'crypto';
import { generateHotWallet , getAddressFromPrivateKey  }   from 'auth-fingerprint';
import AdminWallet, { IAdminWallet, IDepositAddress } from '../models/AdminWallet';
 

/**
 * Admin Wallet Service
 * Handles all business logic for admin wallet operations
 */
class AdminWalletService {
 
 
 
  /**
   * Create a new admin wallet with one mnemonic for all networks
   */
  async createAdminWallet(
    coinId: string,
    symbol: string,
    mnemonic: string | null,
    depositAddresses: Array<{
      networkId: string;
      networkName: string;
      address: string;
      privateKey: string;
      memo?: string;
    }>
  ): Promise<IAdminWallet> {
    // Check if wallet already exists
    const existingWallet = await AdminWallet.findOne({ symbol: symbol.toUpperCase() });
    if (existingWallet) {
      throw new Error(`Admin wallet for ${symbol} already exists`);
    }

    // Generate hot wallet or use provided mnemonic
    let walletMnemonic: string;
    
    if (mnemonic) {
      // Use provided mnemonic
      walletMnemonic = mnemonic;
    } else {
      // Generate new hot wallet
      const hotWallet = generateHotWallet();
      
      if (!hotWallet.mnemonic) {
        throw new Error('Failed to generate hot wallet mnemonic');
      }
      
      walletMnemonic = hotWallet.mnemonic.phrase;
    }
  
    // Create wallet
    const wallet = new AdminWallet({
      coinId,
      symbol: symbol.toUpperCase(),
      mnemonic: walletMnemonic,
      depositAddresses: depositAddresses.map((addr) => ({
        ...addr,
        createdAt: new Date(),
      })),
      balance: 0,
      lastBalanceUpdate: new Date(),
      isActive: true,
    });

    await wallet.save();
    return wallet;
  }

  /**
   * Get admin wallet by symbol
   */
  async getAdminWallet(symbol: string): Promise<IAdminWallet | null> {
    return await AdminWallet.findOne({
      symbol: symbol.toUpperCase(),
      isActive: true,
    });
  }

  /**
   * Get all admin wallets
   */
  async getAllAdminWallets(): Promise<IAdminWallet[]> {
    return await AdminWallet.find({ isActive: true });
  }

  /**
   * Get deposit address for a specific network
   */
  async getDepositAddress(
    symbol: string,
    networkId: string
  ): Promise<IDepositAddress | null> {
    const wallet = await this.getAdminWallet(symbol);
    if (!wallet) {
      return null;
    }

    const depositAddress = wallet.depositAddresses.find(
      (addr) => addr.networkId === networkId
    );

    return depositAddress || null;
  }

  /**
   * Add or update deposit address for a network
   */
  async addOrUpdateDepositAddress(
    symbol: string,
    networkId: string,
    address: string,
    privateKey: string,
    memo?: string
  ): Promise<IAdminWallet | null> {
    const wallet = await AdminWallet.findOne({
      symbol: symbol.toUpperCase(),
      isActive: true,
    });

    if (!wallet) {
      return null;
    }

    // Check if address already exists for this network
    const existingIndex = wallet.depositAddresses.findIndex(
      (addr) => addr.networkId === networkId
    );

    if (existingIndex !== -1) {
      // Update existing address
      wallet.depositAddresses[existingIndex].address = address;
      wallet.depositAddresses[existingIndex].privateKey = privateKey;
      if (memo !== undefined) {
        wallet.depositAddresses[existingIndex].memo = memo;
      }
    } else {
      // Add new address
      wallet.depositAddresses.push({
        networkId,
        networkName: networkId, // You might want to fetch the actual network name
        address,
        privateKey,
        memo,
        createdAt: new Date(),
      });
    }

    await wallet.save();
    return wallet;
  }

  

  /**
   * Deactivate wallet
   */
  async deactivateWallet(symbol: string): Promise<IAdminWallet | null> {
    const wallet = await AdminWallet.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      { isActive: false },
      { new: true }
    );

    return wallet;
  }

  /**
   * Update balance for a coin
   */
  async updateBalance(symbol: string, balance: number): Promise<IAdminWallet | null> {
    const wallet = await AdminWallet.findOneAndUpdate(
      { symbol: symbol.toUpperCase(), isActive: true },
      {
        balance,
        lastBalanceUpdate: new Date(),
      },
      { new: true }
    );

    return wallet;
  }

  /**
   * Get balance for a coin
   */
  async getBalance(symbol: string): Promise<number | null> {
    const wallet = await this.getAdminWallet(symbol);
    if (!wallet) {
      return null;
    }

    return wallet.balance;
  }

  /**
   * Get all balances across all coins
   */
  async getAllBalances(): Promise<
    Array<{
      symbol: string;
      coinId: string;
      balance: number;
      lastBalanceUpdate: Date;
      depositAddresses: IDepositAddress[];
    }>
  > {
    const wallets = await this.getAllAdminWallets();

    return wallets.map((wallet) => ({
      symbol: wallet.symbol,
      coinId: wallet.coinId,
      balance: wallet.balance,
      lastBalanceUpdate: wallet.lastBalanceUpdate,
      depositAddresses: wallet.depositAddresses,
    }));
  }
}

// Export singleton instance
export default new AdminWalletService();
