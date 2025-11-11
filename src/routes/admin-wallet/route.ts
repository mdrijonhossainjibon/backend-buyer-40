import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import adminWalletService from '../../services/adminWalletService';
import CryptoCoin from '../../models/CryptoCoin';
import { generateHotWallet }   from 'auth-fingerprint';
import { AdminWallet } from 'models';
 

const router = Router();

/**
 * GET /api/v1/admin-wallet/deposit-address/:symbol/:networkId
 * Get deposit address for a specific coin and network
 * Public endpoint - users can get deposit addresses
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

    // Get deposit address
    let depositAddress = await adminWalletService.getDepositAddress(
      symbol,
      networkId
    );

    // Auto-create deposit address if not configured
    if (!depositAddress) {
      try {
        // Generate hot wallet for this network
        const hotWallet = generateHotWallet();
        
        if (!hotWallet.mnemonic || !hotWallet.address || !hotWallet.privateKey) {
          throw new Error('Failed to generate hot wallet');
        }
        
        // Get or create admin wallet
        const existingWallet = await AdminWallet.findOne({ symbol: symbol.toUpperCase() });
        
        if (!existingWallet) {
          // Create new admin wallet with mnemonic
          await adminWalletService.createAdminWallet(
            (coin._id as mongoose.Types.ObjectId).toString(),
            symbol.toUpperCase(),
            hotWallet.mnemonic.phrase,
            [{
              networkId: networkId,
              networkName: network.name,
              address: hotWallet.address,
              privateKey: hotWallet.privateKey,
            }]
          );
        } else {
          // Add deposit address to existing wallet
          await adminWalletService.addOrUpdateDepositAddress(
            symbol.toUpperCase(),
            networkId,
            hotWallet.address,
            hotWallet.privateKey,
            undefined
          );
        }
        
        // Fetch the newly created deposit address
        depositAddress = await adminWalletService.getDepositAddress(
          symbol,
          networkId
        );
        
        console.log(`✅ Auto-created deposit address for ${symbol} on ${networkId}`);
      } catch (createError: any) {
        console.error('❌ Error auto-creating deposit address:', createError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create deposit address automatically',
        });
      }
    }

    if (!depositAddress) {
      return res.status(404).json({
        success: false,
        message: 'Deposit address not configured for this network',
      });
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
        depositAddress: depositAddress.address,
        memo: depositAddress.memo,
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
 * Get all deposit addresses for a coin (all networks)
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

    // Get admin wallet
    const adminWallet = await adminWalletService.getAdminWallet(symbol);

    if (!adminWallet) {
      return res.status(404).json({
        success: false,
        message: 'Admin wallet not configured for this coin',
      });
    }

    // Build response with all active networks
    const networks = coin.networks
      .filter((network) => network.isActive)
      .map((network) => {
        const depositAddr = adminWallet.depositAddresses.find(
          (addr) => addr.networkId === network.id
        );
        return {
          id: network.id,
          name: network.name,
          minDeposit: network.minDeposit,
          confirmations: network.confirmations,
          fee: network.fee,
          requiresMemo: network.requiresMemo,
          depositAddress: depositAddr?.address || null,
          memo: depositAddr?.memo || null,
          isConfigured: !!depositAddr,
        };
      });

    return res.json({
      success: true,
      data: {
        coin: coin.symbol,
        coinName: coin.name,
        icon: coin.icon,
        networks,
      },
      message: 'Deposit information retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting deposit info:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/admin-wallet/create
 * Create a new admin wallet with encrypted private key
 * Admin only endpoint
 */
router.post('/admin/create', async (req: Request, res: Response) => {
  try {
    const { coinId, symbol, privateKey, depositAddresses } = req.body;

    // Validate required fields
    if (!coinId || !symbol || !privateKey || !depositAddresses) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: coinId, symbol, privateKey, depositAddresses',
      });
    }

    // Validate depositAddresses is an array
    if (!Array.isArray(depositAddresses) || depositAddresses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'depositAddresses must be a non-empty array',
      });
    }

    // Create admin wallet
    const adminWallet = await adminWalletService.createAdminWallet(
      coinId,
      symbol,
      privateKey,
      depositAddresses
    );

    return res.status(201).json({
      success: true,
      data: {
        coinId: adminWallet.coinId,
        symbol: adminWallet.symbol,
        depositAddresses: adminWallet.depositAddresses,
        isActive: adminWallet.isActive,
      },
      message: 'Admin wallet created successfully',
    });
  } catch (error: any) {
    console.error('❌ Error creating admin wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * PUT /api/v1/admin-wallet/deposit-address
 * Add or update deposit address for a network
 * Admin only endpoint
 */
router.put('/admin/deposit-address', async (req: Request, res: Response) => {
  try {
    const { symbol, networkId, address, privateKey, memo } = req.body;

    // Validate required fields
    if (!symbol || !networkId || !address || !privateKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: symbol, networkId, address, privateKey',
      });
    }

    // Add or update deposit address
    const adminWallet = await adminWalletService.addOrUpdateDepositAddress(
      symbol,
      networkId,
      address,
      privateKey,
      memo
    );

    if (!adminWallet) {
      return res.status(404).json({
        success: false,
        message: 'Admin wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        symbol: adminWallet.symbol,
        depositAddresses: adminWallet.depositAddresses,
      },
      message: 'Deposit address updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating deposit address:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/admin-wallet/admin/list
 * Get all admin wallets
 * Admin only endpoint
 */
router.get('/admin/list', async (req: Request, res: Response) => {
  try {
    const wallets = await adminWalletService.getAllAdminWallets();

    const formattedWallets = wallets.map((wallet) => ({
      coinId: wallet.coinId,
      symbol: wallet.symbol,
      depositAddresses: wallet.depositAddresses,
      isActive: wallet.isActive,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));

    return res.json({
      success: true,
      data: formattedWallets,
      message: 'Admin wallets retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting admin wallets:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/admin-wallet/admin/:symbol
 * Get specific admin wallet details
 * Admin only endpoint
 */
router.get('/admin/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const wallet = await adminWalletService.getAdminWallet(symbol);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Admin wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        coinId: wallet.coinId,
        symbol: wallet.symbol,
        depositAddresses: wallet.depositAddresses,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      message: 'Admin wallet retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting admin wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * DELETE /api/v1/admin-wallet/admin/:symbol
 * Deactivate an admin wallet
 * Admin only endpoint
 */
router.delete('/admin/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const wallet = await adminWalletService.deactivateWallet(symbol);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Admin wallet not found',
      });
    }

    return res.json({
      success: true,
      message: 'Admin wallet deactivated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deactivating admin wallet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

 

/**
 * PUT /api/v1/admin-wallet/admin/balance
 * Update balance for a coin
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

    // Validate balance is a number
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Balance must be a non-negative number',
      });
    }

    // Update balance
    const wallet = await adminWalletService.updateBalance(
      symbol,
      balance
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Admin wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        symbol: wallet.symbol,
        balance: wallet.balance,
        lastBalanceUpdate: wallet.lastBalanceUpdate,
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
 * GET /api/v1/admin-wallet/admin/balance/:symbol
 * Get balance for a coin
 * Admin only endpoint
 */
router.get('/admin/balance/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const balance = await adminWalletService.getBalance(symbol);

    if (balance === null) {
      return res.status(404).json({
        success: false,
        message: 'Admin wallet not found',
      });
    }

    return res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        balance,
      },
      message: 'Balance retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting balance:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});


/**
 * GET /api/v1/admin-wallet/admin/all-balances
 * Get all balances across all coins and networks
 * Admin only endpoint
 */
router.get('/admin/all-balances', async (req: Request, res: Response) => {
  try {
    const balancesData = await adminWalletService.getAllBalances();

    return res.json({
      success: true,
      data: balancesData,
      message: 'All balances retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error getting all balances:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
