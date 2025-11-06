import { Router, Request, Response } from 'express';
import ConversionRate from '../../models/ConversionRate';
import ConversionHistory from '../../models/ConversionHistory';
import Wallet from '../../models/Wallet';
import User from '../../models/User';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/v1/converter/rates
 * Get all active conversion rates
 */
router.get('/converter/rates', async (req: Request, res: Response): Promise<void> => {
  try {
    const rates = await ConversionRate.find({ isActive: true })
      .select('from to rate minAmount maxAmount fee')
      .lean();

    res.status(200).json({
      success: true,
      data: rates,
    });
  } catch (error: any) {
    console.error('❌ Error fetching conversion rates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversion rates',
    });
  }
});

/**
 * GET /api/v1/converter/history/:userId
 * Get conversion history for a user
 */
router.get('/converter/history/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const history = await ConversionHistory.find({ userId: parseInt(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('❌ Error fetching conversion history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversion history',
    });
  }
});

/**
 * POST /api/v1/converter/convert
 * Convert currency
 */
router.post('/converter/convert', async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, fromCurrency, toCurrency, amount } = req.body;

    // Validate required fields
    if (!userId || !fromCurrency || !toCurrency || !amount) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, fromCurrency, toCurrency, amount',
      });
      return;
    }

    // Validate amount
    if (amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0',
      });
      return;
    }

    // Validate currencies
    if (!['xp', 'usdt'].includes(fromCurrency) || !['xp', 'usdt'].includes(toCurrency)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        error: 'Invalid currency type. Only xp and usdt are supported',
      });
      return;
    }

    // Cannot convert same currency
    if (fromCurrency === toCurrency) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        error: 'Cannot convert to the same currency',
      });
      return;
    }

    // Get conversion rate
    const conversionRate = await ConversionRate.findOne({
      from: fromCurrency,
      to: toCurrency,
      isActive: true,
    }).session(session);

    if (!conversionRate) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({
        success: false,
        error: `Conversion rate not found for ${fromCurrency} to ${toCurrency}`,
      });
      return;
    }

    // Validate amount limits
    if (amount < conversionRate.minAmount) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        error: `Amount must be at least ${conversionRate.minAmount} ${fromCurrency.toUpperCase()}`,
      });
      return;
    }

    if (amount > conversionRate.maxAmount) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        error: `Amount cannot exceed ${conversionRate.maxAmount} ${fromCurrency.toUpperCase()}`,
      });
      return;
    }

    // Get user wallet
    const wallet = await Wallet.findOne({ userId }).session(session);

    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    // Check if user has sufficient balance
    const availableBalance = wallet.balances[fromCurrency as 'xp' | 'usdt'] - wallet.locked[fromCurrency as 'xp' | 'usdt'];
    if (availableBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        error: `Insufficient ${fromCurrency.toUpperCase()} balance. Available: ${availableBalance}`,
      });
      return;
    }

    // Calculate conversion
    const feeAmount = (amount * conversionRate.fee) / 100;
    const amountAfterFee = amount - feeAmount;
    const toAmount = amountAfterFee * conversionRate.rate;

    // Update wallet balances
    wallet.balances[fromCurrency as 'xp' | 'usdt'] -= amount;
    wallet.balances[toCurrency as 'xp' | 'usdt'] += toAmount;
    wallet.totalSpent[fromCurrency as 'xp' | 'usdt'] += amount;
    wallet.totalEarned[toCurrency as 'xp' | 'usdt'] += toAmount;
    wallet.lastTransaction = new Date();

    await wallet.save({ session });

    // Create conversion history record
    const conversion = await ConversionHistory.create(
      [
        {
          userId,
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount,
          rate: conversionRate.rate,
          fee: conversionRate.fee,
          status: 'completed',
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return success response
    res.status(200).json({
      success: true,
      message: `Successfully converted ${amount} ${fromCurrency.toUpperCase()} to ${toAmount.toFixed(2)} ${toCurrency.toUpperCase()}`,
      data: {
        conversion: conversion[0],
        newBalances: {
          xp: wallet.balances.xp,
          usdt: wallet.balances.usdt,
        },
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error converting currency:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to convert currency',
    });
  }
});

export default router;
