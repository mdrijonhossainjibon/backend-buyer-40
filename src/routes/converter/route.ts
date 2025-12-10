import { Router, Request, Response } from 'express';
import ConversionRate from '../../models/ConversionRate';
import ConversionHistory from '../../models/ConversionHistory';
import Wallet from '../../models/Wallet';
import User from '../../models/User';



const router = Router();

/**
 * GET /api/v1/converter/rates
 * Get all conversion rates (admin can see all, users see only active)
 */
router.get('/converter/rates', async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.query.admin === 'true'; // You can use auth middleware to check admin role
    
    const query = isAdmin ? {} : { isActive: true };
    const rates = await ConversionRate.find(query)
      .sort({ createdAt: -1 })
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
 * GET /api/v1/converter/rates/:id
 * Get single conversion rate by ID
 */
router.get('/converter/rates/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const rate = await ConversionRate.findById(id).lean();

    if (!rate) {
      res.status(404).json({
        success: false,
        error: 'Conversion rate not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: rate,
    });
  } catch (error: any) {
    console.error('❌ Error fetching conversion rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversion rate',
    });
  }
});

/**
 * POST /api/v1/converter/rates
 * Create new conversion rate (Admin only)
 */
router.post('/converter/rates', async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, rate, minAmount, maxAmount, fee, isActive } = req.body;

    // Validate required fields
    if (!from || !to || rate === undefined || minAmount === undefined || maxAmount === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: from, to, rate, minAmount, maxAmount',
      });
      return;
    }

    // Validate currencies
    if (!['xp', 'usdt'].includes(from) || !['xp', 'usdt'].includes(to)) {
      res.status(400).json({
        success: false,
        error: 'Invalid currency type. Only xp and usdt are supported',
      });
      return;
    }

    // Cannot convert same currency
    if (from === to) {
      res.status(400).json({
        success: false,
        error: 'Cannot create rate for same currency conversion',
      });
      return;
    }

    // Check if rate already exists
    const existingRate = await ConversionRate.findOne({ from, to });
    if (existingRate) {
      res.status(400).json({
        success: false,
        error: `Conversion rate for ${from} to ${to} already exists`,
      });
      return;
    }

    // Create new rate
    const newRate = await ConversionRate.create({
      from,
      to,
      rate,
      minAmount,
      maxAmount,
      fee: fee || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Conversion rate created successfully',
      data: newRate,
    });
  } catch (error: any) {
    console.error('❌ Error creating conversion rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create conversion rate',
    });
  }
});

/**
 * PUT /api/v1/converter/rates/:id
 * Update conversion rate (Admin only)
 */
router.put('/converter/rates/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { from, to, rate, minAmount, maxAmount, fee, isActive } = req.body;

    const conversionRate = await ConversionRate.findById(id);

    if (!conversionRate) {
      res.status(404).json({
        success: false,
        error: 'Conversion rate not found',
      });
      return;
    }

    // Update fields if provided
    if (from !== undefined) conversionRate.from = from;
    if (to !== undefined) conversionRate.to = to;
    if (rate !== undefined) conversionRate.rate = rate;
    if (minAmount !== undefined) conversionRate.minAmount = minAmount;
    if (maxAmount !== undefined) conversionRate.maxAmount = maxAmount;
    if (fee !== undefined) conversionRate.fee = fee;
    if (isActive !== undefined) conversionRate.isActive = isActive;

    await conversionRate.save();

    res.status(200).json({
      success: true,
      message: 'Conversion rate updated successfully',
      data: conversionRate,
    });
  } catch (error: any) {
    console.error('❌ Error updating conversion rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update conversion rate',
    });
  }
});

/**
 * PATCH /api/v1/converter/rates/:id/status
 * Toggle conversion rate status (Admin only)
 */
router.patch('/converter/rates/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      res.status(400).json({
        success: false,
        error: 'isActive field is required',
      });
      return;
    }

    const conversionRate = await ConversionRate.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!conversionRate) {
      res.status(404).json({
        success: false,
        error: 'Conversion rate not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Conversion rate ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: conversionRate,
    });
  } catch (error: any) {
    console.error('❌ Error toggling conversion rate status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle conversion rate status',
    });
  }
});

/**
 * DELETE /api/v1/converter/rates/:id
 * Delete conversion rate (Admin only)
 */
router.delete('/converter/rates/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const conversionRate = await ConversionRate.findByIdAndDelete(id);

    if (!conversionRate) {
      res.status(404).json({
        success: false,
        error: 'Conversion rate not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Conversion rate deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting conversion rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete conversion rate',
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

  
  try {
    const { userId, fromCurrency, toCurrency, amount } = req.body;

    // Validate required fields
    if (!userId || !fromCurrency || !toCurrency || !amount) {
      
      
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, fromCurrency, toCurrency, amount',
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

    // Validate currencies
    if (!['xp', 'usdt'].includes(fromCurrency) || !['xp', 'usdt'].includes(toCurrency)) {
      
      
      res.status(400).json({
        success: false,
        error: 'Invalid currency type. Only xp and usdt are supported',
      });
      return;
    }

    // Cannot convert same currency
    if (fromCurrency === toCurrency) {
      
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
    })

    if (!conversionRate) {
    
      
      res.status(404).json({
        success: false,
        error: `Conversion rate not found for ${fromCurrency} to ${toCurrency}`,
      });
      return;
    }

    // Validate amount limits
    if (amount < conversionRate.minAmount) {
      
      res.status(400).json({
        success: false,
        error: `Amount must be at least ${conversionRate.minAmount} ${fromCurrency.toUpperCase()}`,
      });
      return;
    }

    if (amount > conversionRate.maxAmount) {
      
      res.status(400).json({
        success: false,
        error: `Amount cannot exceed ${conversionRate.maxAmount} ${fromCurrency.toUpperCase()}`,
      });
      return;
    }

    // Get user wallet
    const wallet = await Wallet.findOne({ userId })

    if (!wallet) {
      
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    // Check if user has sufficient balance
    const availableBalance = wallet.balances[fromCurrency as 'xp' | 'usdt'] - wallet.locked[fromCurrency as 'xp' | 'usdt'];
    if (availableBalance < amount) {
      
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

    await wallet.save();

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
      
    );

   
    

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
    
    
    console.error('❌ Error converting currency:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to convert currency',
    });
  }
});

export default router;
