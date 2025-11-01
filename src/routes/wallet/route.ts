import { Router, Request, Response } from 'express';
import Wallet from '../../models/Wallet';
import User from '../../models/User';

const router = Router();

/**
 * GET /api/v1/wallet/:userId
 * Get wallet balance for a user
 */
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);

    if (!userId || isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 },
      });
    }

    // Calculate available balances
    const available = {
      xp: wallet.balances.xp - wallet.locked.xp,
      usdt: wallet.balances.usdt - wallet.locked.usdt,
      spin: wallet.balances.spin - wallet.locked.spin,
    };

    res.status(200).json({
      success: true,
      data: {
        userId,
        balances: wallet.balances,
        locked: wallet.locked,
        available,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        lastTransaction: wallet.lastTransaction,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/wallet/add-funds
 * Add funds to wallet (for testing purposes)
 */
router.post('/add-funds', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token, amount } = req.body;

    // Validate required fields
    if (!userId || !token || !amount) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, token, amount',
      });
      return;
    }

    // Validate token type
    const tokenLower = token.toLowerCase();
    if (!['xp', 'usdt', 'spin'].includes(tokenLower)) {
      res.status(400).json({
        success: false,
        error: 'Invalid token. Must be one of: xp, usdt, spin',
      });
      return;
    }

    // Validate amount
    if (amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0',
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 },
      });
    }

    // Add funds
    wallet.balances[tokenLower as 'xp' | 'usdt' | 'spin'] += amount;
    wallet.totalEarned[tokenLower as 'xp' | 'usdt' | 'spin'] += amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    res.status(200).json({
      success: true,
      message: `Added ${amount} ${token.toUpperCase()} to wallet`,
      data: {
        userId,
        token: token.toUpperCase(),
        amount,
        newBalance: wallet.balances[tokenLower as 'xp' | 'usdt' | 'spin'],
      },
    });
  } catch (error: any) {
    console.error('❌ Error adding funds:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/wallet/:userId/transactions
 * Get swap transaction history for a user
 */
router.get('/:userId/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const { limit = 20, offset = 0, status } = req.query;

    if (!userId || isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    // Build query
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    // Import Swap model
    const Swap = (await import('../../models/Swap')).default;

    // Get transactions
    const transactions = await Swap.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Swap.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + Number(limit),
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

export default router;
