import { Router, Request, Response } from 'express';
import Wallet from '../../models/Wallet';
import User from '../../models/User';

const router = Router();

/**
 * @swagger
 * /api/v1/user-wallet/{userId}:
 *   get:
 *     summary: Get user wallet details
 *     description: Retrieve complete wallet information including balances, locked amounts, and transaction history
 *     tags: [User Wallet]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Wallet retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: number
 *                     balances:
 *                       type: object
 *                       properties:
 *                         xp:
 *                           type: number
 *                         usdt:
 *                           type: number
 *                         spin:
 *                           type: number
 *                     locked:
 *                       type: object
 *                       properties:
 *                         xp:
 *                           type: number
 *                         usdt:
 *                           type: number
 *                         spin:
 *                           type: number
 *                     available:
 *                       type: object
 *                       properties:
 *                         xp:
 *                           type: number
 *                         usdt:
 *                           type: number
 *                         spin:
 *                           type: number
 *                     totalEarned:
 *                       type: object
 *                     totalSpent:
 *                       type: object
 *                     lastTransaction:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({   userId });
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId: user.userId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user.userId,
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
        userId: wallet.userId,
        balances: wallet.balances,
        locked: wallet.locked,
        available,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        lastTransaction: wallet.lastTransaction,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching user wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/v1/user-wallet/{userId}/update-balance:
 *   put:
 *     summary: Update user wallet balance
 *     description: Update available and locked balances for a specific asset
 *     tags: [User Wallet]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - asset
 *               - availableBalance
 *               - lockedBalance
 *             properties:
 *               asset:
 *                 type: string
 *                 enum: [xp, usdt, spin]
 *                 description: The asset type to update
 *               availableBalance:
 *                 type: number
 *                 description: New available balance amount
 *               lockedBalance:
 *                 type: number
 *                 description: New locked balance amount
 *     responses:
 *       200:
 *         description: Balance updated successfully
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: User or wallet not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/update-balance', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const { asset, availableBalance, lockedBalance } = req.body;

    // Validate required fields
    if (!userId || !asset || availableBalance === undefined || lockedBalance === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, asset, availableBalance, lockedBalance',
      });
      return;
    }

    // Validate asset type
    const assetLower = asset.toLowerCase();
    if (!['xp', 'usdt', 'spin'].includes(assetLower)) {
      res.status(400).json({
        success: false,
        error: 'Invalid asset. Must be one of: xp, usdt, spin',
      });
      return;
    }

    // Validate amounts
    if (availableBalance < 0 || lockedBalance < 0) {
      res.status(400).json({
        success: false,
        error: 'Balances cannot be negative',
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({   userId });
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId: user.userId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user.userId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 },
      });
    }

    // Update balances
    const assetKey = assetLower as 'xp' | 'usdt' | 'spin';
    wallet.balances[assetKey] = availableBalance;
    wallet.locked[assetKey] = lockedBalance;
    wallet.lastTransaction = new Date();
    await wallet.save();

    // Calculate available balances
    const available = {
      xp: wallet.balances.xp - wallet.locked.xp,
      usdt: wallet.balances.usdt - wallet.locked.usdt,
      spin: wallet.balances.spin - wallet.locked.spin,
    };

    res.status(200).json({
      success: true,
      message: `Updated ${asset.toUpperCase()} balance successfully`,
      data: {
        userId: wallet.userId,
        asset: asset.toUpperCase(),
        balances: wallet.balances,
        locked: wallet.locked,
        available,
        lastTransaction: wallet.lastTransaction,
      },
    });
  } catch (error: any) {
    console.error('❌ Error updating wallet balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/v1/user-wallet/{userId}/summary:
 *   get:
 *     summary: Get wallet summary
 *     description: Get a quick summary of wallet balances and totals
 *     tags: [User Wallet]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Wallet summary retrieved successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({  userId });
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get wallet
    let wallet = await Wallet.findOne({ userId: user.userId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user.userId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 },
      });
    }

    // Calculate totals
    const totalBalance = {
      xp: wallet.balances.xp + wallet.locked.xp,
      usdt: wallet.balances.usdt + wallet.locked.usdt,
      spin: wallet.balances.spin + wallet.locked.spin,
    };

    const available = {
      xp: wallet.balances.xp - wallet.locked.xp,
      usdt: wallet.balances.usdt - wallet.locked.usdt,
      spin: wallet.balances.spin - wallet.locked.spin,
    };

    res.status(200).json({
      success: true,
      data: {
        userId: wallet.userId,
        totalBalance,
        available,
        locked: wallet.locked,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        lastTransaction: wallet.lastTransaction,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching wallet summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

export default router;
