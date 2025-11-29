import { Router, Request, Response } from 'express';
import CryptoCoin from '../../models/CryptoCoin';
import Wallets from '../../models/Wallets';
import { AdminWallet } from '../../models';
import { generateHotWallet } from 'auth-fingerprint';

const router = Router();

/**
 * GET /api/v1/admin-wallet/deposit-address/:symbol/:networkId
 * Get deposit address for a specific coin and network
 */
router.get('/deposit-address/:symbol/:networkId', async (req: Request, res: Response) => {
  try {
    const { symbol, networkId } = req.params;

    // Verify coin exists and is active
    const coin = await CryptoCoin.findOne({
      symbol: symbol.toUpperCase(),
      isActive: true,
    });

    if (!coin) {
      return res.status(404).json({
        success: false,
        message: 'Coin not found or inactive',
      });
    }

    // Verify network exists and is active
    const network = coin.networks.find(
      (n) => n.id === networkId && n.isActive
    );

    if (!network) {
      return res.status(404).json({
        success: false,
        message: 'Network not found or inactive',
      });
    }

    // Get hot wallet (AdminWallet) that supports this network
    let hotWallet = await AdminWallet.findOne({ 
      status: 'active',
    });

    // Auto-create hot wallet if not exists
    if (!hotWallet) {
      try {
        const generated = generateHotWallet();
        
        if (!generated.mnemonic || !generated.address || !generated.privateKey) {
          throw new Error('Failed to generate hot wallet');
        }

        hotWallet = await AdminWallet.create({
          mnemonic: generated.mnemonic.phrase,
          privateKey: generated.privateKey,
          address: generated.address,
          status: 'active',
          supportedNetworks: [networkId],
        });
        
        console.log(`✅ Auto-created hot wallet for ${networkId}`);
      } catch (createError: any) {
        console.error('❌ Error auto-creating hot wallet:', createError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create hot wallet automatically',
        });
      }
    }

    return res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        coinName: coin.name,
        network: {
          id: network.id,
          name: network.name,
          minDeposit: network.minDeposit,
          confirmations: network.confirmations,
          fee: network.fee,
          requiresMemo: network.requiresMemo,
        },
        depositAddress: hotWallet.address,
      },
      message: 'Deposit address retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting deposit address:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/admin-wallet/deposit-info/:symbol
 * Get wallet info for a coin (balance + networks + deposit addresses)
 */
router.get('/deposit-info/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    // Get coin with networks
    const coin = await CryptoCoin.findOne({
      symbol: symbol.toUpperCase(),
      isActive: true,
    });

    if (!coin) {
      return res.status(404).json({
        success: false,
        message: 'Coin not found or inactive',
      });
    }

    // Get wallet (balance holder)
    const wallet = await Wallets.findOne({ 
      symbol: symbol.toUpperCase(),
      status: 'active' 
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not configured for this coin',
      });
    }

    // Get hot wallets for deposit addresses
    const hotWallets = await AdminWallet.find({ status: 'active' });

    // Build response with all active networks
    const networks = coin.networks
      .filter((network) => network.isActive)
      .map((network) => {
        const isSupported = wallet.supportedNetworks.includes(network.id);
        // Find hot wallet that supports this network
        const hotWallet = hotWallets.find(hw => hw.supportedNetworks.includes(network.id));
        return {
          id: network.id,
          name: network.name,
          minDeposit: network.minDeposit,
          confirmations: network.confirmations,
          fee: network.fee,
          requiresMemo: network.requiresMemo,
          isSupported,
          depositAddress: hotWallet?.address || null,
        };
      });

    return res.json({
      success: true,
      data: {
        symbol: wallet.symbol,
        balance: wallet.balance,
        status: wallet.status,
        supportedNetworks: wallet.supportedNetworks,
        networks,
      },
      message: 'Wallet info retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting wallet info:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/admin-wallet/create
 * Create a new wallet
 * Admin only endpoint
 */
router.post('/admin/create', async (req: Request, res: Response) => {
  try {
    const { symbol, supportedNetworks} = req.body;

    // Validate required fields CV 
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: symbol',
      });
    }

    // Check if wallet already exists
    const existingWallet = await Wallets.findOne({ symbol: symbol.toUpperCase() });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet already exists for this symbol',
      });
    }

    // Create wallet
    const wallet = await Wallets.create({
      symbol: symbol.toUpperCase(),
      supportedNetworks: supportedNetworks || [],
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      data: {
        symbol: wallet.symbol,
        supportedNetworks: wallet.supportedNetworks,
        balance: wallet.balance,
        status: wallet.status,
      },
      message: 'Wallet created successfully',
    });
  } catch (error: any) {
    console.error('❌ Error creating wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * PUT /api/v1/admin-wallet/supported-networks
 * Add or update supported networks for a wallet
 * Admin only endpoint
 */
router.put('/admin/supported-networks', async (req: Request, res: Response) => {
  try {
    const { symbol, supportedNetworks } = req.body;

    // Validate required fields
    if (!symbol || !supportedNetworks) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: symbol, supportedNetworks',
      });
    }

    // Update supported networks
    const wallet = await Wallets.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      { supportedNetworks },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        symbol: wallet.symbol,
        supportedNetworks: wallet.supportedNetworks,
      },
      message: 'Supported networks updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating supported networks:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * PUT /api/v1/admin-wallet/balance
 * Update balance for a wallet
 * Admin only endpoint
 */
router.put('/admin/balance', async (req: Request, res: Response) => {
  try {
    const { symbol, balance } = req.body;

    // Validate required fields
    if (!symbol || balance === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: symbol, balance',
      });
    }

    // Validate balance
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Balance must be a non-negative number',
      });
    }

    // Update balance
    const wallet = await Wallets.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      { balance },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        symbol: wallet.symbol,
        balance: wallet.balance,
      },
      message: 'Balance updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating balance:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/admin-wallet/admin/list
 * Get all wallets
 * Admin only endpoint
 */
router.get('/admin/list', async (req: Request, res: Response) => {
  try {
    const wallets = await Wallets.find({});
  
    return res.json({
      success: true,
      data: wallets.map((wallet) => ({
        symbol: wallet.symbol,
        supportedNetworks: wallet.supportedNetworks,
        balance: wallet.balance,
        status: wallet.status,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      })),
      message: 'Wallets retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting wallets:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/admin-wallet/admin/:symbol
 * Get specific wallet details
 * Admin only endpoint
 */
router.get('/admin/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const wallet = await Wallets.findOne({ symbol: symbol.toUpperCase() });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        symbol: wallet.symbol,
        supportedNetworks: wallet.supportedNetworks,
        balance: wallet.balance,
        status: wallet.status,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      message: 'Wallet retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * PUT /api/v1/admin-wallet/admin/status
 * Update status for a wallet
 * Admin only endpoint
 */
router.put('/admin/status', async (req: Request, res: Response) => {
  try {
    const { symbol, status } = req.body;

    // Validate required fields
    if (!symbol || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: symbol, status',
      });
    }

    // Validate status
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be: active, inactive, or suspended',
      });
    }

    // Update status
    const wallet = await Wallets.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      { status },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        symbol: wallet.symbol,
        status: wallet.status,
      },
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * DELETE /api/v1/admin-wallet/admin/:symbol
 * Deactivate a wallet
 * Admin only endpoint
 */
router.delete('/admin/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const wallet = await Wallets.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      { status: 'inactive' },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    return res.json({
      success: true,
      message: 'Wallet deactivated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deactivating wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/admin-wallet/all-wallets
 * Get all wallets (balance holders)
 * Admin only endpoint
 */
router.get('/all-wallets', async (req: Request, res: Response) => {
  try {
    const wallets = await Wallets.find({});
    
    return res.json({
      success: true,
      data: wallets.map((w) => ({
        symbol: w.symbol,
        supportedNetworks: w.supportedNetworks,
        balance: w.balance,
        status: w.status,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
      message: 'All wallets retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting all wallets:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// ============================================
// HOT WALLET (AdminWallet) ROUTES
// ============================================

/**
 * POST /api/v1/admin-wallet/hot-wallet/create
 * Create a new hot wallet
 * Admin only endpoint
 */
router.post('/hot-wallet/create', async (req: Request, res: Response) => {
  try {
    const { supportedNetworks } = req.body;

    // Generate hot wallet
    const generated = generateHotWallet();
    
    if (!generated.mnemonic || !generated.address || !generated.privateKey) {
      throw new Error('Failed to generate hot wallet');
    }

    const hotWallet = await AdminWallet.create({
      mnemonic: generated.mnemonic.phrase,
      privateKey: generated.privateKey,
      address: generated.address,
      status: 'active',
      supportedNetworks: supportedNetworks || [],
    });

    return res.status(201).json({
      success: true,
      data: {
        address: hotWallet.address,
        status: hotWallet.status,
        supportedNetworks: hotWallet.supportedNetworks,
      },
      message: 'Hot wallet created successfully',
    });
  } catch (error: any) {
    console.error('❌ Error creating hot wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/admin-wallet/hot-wallet/list
 * Get all hot wallets
 * Admin only endpoint
 */
router.get('/hot-wallet/list', async (req: Request, res: Response) => {
  try {
    const hotWallets = await AdminWallet.find({});

    return res.json({
      success: true,
      data: hotWallets.map((hw) => ({
        address: hw.address,
        status: hw.status,
        supportedNetworks: hw.supportedNetworks,
        createdAt: hw.createdAt,
        updatedAt: hw.updatedAt,
      })),
      message: 'Hot wallets retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting hot wallets:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * PUT /api/v1/admin-wallet/hot-wallet/supported-networks
 * Update supported networks for a hot wallet
 * Admin only endpoint
 */
router.put('/hot-wallet/supported-networks', async (req: Request, res: Response) => {
  try {
    const { address, supportedNetworks } = req.body;

    if (!address || !supportedNetworks) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: address, supportedNetworks',
      });
    }

    const hotWallet = await AdminWallet.findOneAndUpdate(
      { address },
      { supportedNetworks },
      { new: true }
    );

    if (!hotWallet) {
      return res.status(404).json({
        success: false,
        message: 'Hot wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        address: hotWallet.address,
        supportedNetworks: hotWallet.supportedNetworks,
      },
      message: 'Supported networks updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating hot wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * PUT /api/v1/admin-wallet/hot-wallet/status
 * Update status for a hot wallet
 * Admin only endpoint
 */
router.put('/hot-wallet/status', async (req: Request, res: Response) => {
  try {
    const { address, status } = req.body;

    if (!address || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: address, status',
      });
    }

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be: active, inactive, or suspended',
      });
    }

    const hotWallet = await AdminWallet.findOneAndUpdate(
      { address },
      { status },
      { new: true }
    );

    if (!hotWallet) {
      return res.status(404).json({
        success: false,
        message: 'Hot wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        address: hotWallet.address,
        status: hotWallet.status,
      },
      message: 'Hot wallet status updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating hot wallet status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});


/**
 * GET /api/v1/admin-wallet/deposit-coins
 * Get all coins available for deposit with their networks and addresses
 */
router.get('/deposit-coins', async (req: Request, res: Response) => {
  try {
    
    // Get all active coins
    const coins = await CryptoCoin.find({ isActive: true });

    
    // Get all active hot wallets
    const hotWallets = await AdminWallet.find({ status: 'active' });

    const depositCoins = coins.map((coin) => {
  
      const networks = coin.networks
        .filter((network) => network.isActive)
        .map((network) => {
          const hotWallet = hotWallets.find(hw => hw.supportedNetworks.includes(network.id));
          return {
            id: network.id,
            name: network.name,
            type: network.type || 'Native',
            address: hotWallet?.address || '',
            minDeposit: String(network.minDeposit || '0'),
            confirmations: network.confirmations || 1,
            estimatedTime: network.estimatedTime || '~5 min',
            fee: String(network.fee || '0'),
            ...(network.requiresMemo && { memo: network.memo || '' }),
          };
        });

      return {
        id: coin.symbol.toLowerCase(),
        name: coin.name,
        symbol: coin.symbol,
        networks,
      };
    });

    return res.json({
      success: true,
      data: depositCoins,
      message: 'Deposit coins retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting deposit coins:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
