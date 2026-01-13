import { Server, Socket } from 'socket.io';
import ConversionRate from '../../models/ConversionRate';
import ConversionHistory from '../../models/ConversionHistory';
import Wallet from '../../models/Wallet';
import mongoose from 'mongoose';

export class ConverterSocketController {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle converter:convert event
   */
  async handleConvert(socket: Socket, data: any) {
    

    try {
      const { userId, fromCurrency, toCurrency, amount } = data;

      console.log(`🔄 Processing conversion for user ${userId}: ${amount} ${fromCurrency} → ${toCurrency}`);

      // Step 1: Verifying transaction
      socket.emit('converter:processing', {
        step: 'verifying',
        progress: 25,
        message: 'Verifying transaction',
      });

      await this.delay(5000); // 5 seconds delay

      // Validate required fields
      if (!userId || !fromCurrency || !toCurrency || !amount) {
        throw new Error('Missing required fields');
      }

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate currencies
      if (!['xp', 'usdt'].includes(fromCurrency) || !['xp', 'usdt'].includes(toCurrency)) {
        throw new Error('Invalid currency type');
      }

      // Cannot convert same currency
      if (fromCurrency === toCurrency) {
        throw new Error('Cannot convert to the same currency');
      }

      // Get conversion rate
      const conversionRate = await ConversionRate.findOne({
        from: fromCurrency,
        to: toCurrency,
        isActive: true,
      })

      if (!conversionRate) {
        throw new Error(`Conversion rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      // Step 2: Processing conversion
      socket.emit('converter:processing', {
        step: 'processing',
        progress: 50,
        message: 'Processing conversion',
      });

      await this.delay(7000); // 7 seconds delay

      // Validate amount limits
      if (amount < conversionRate.minAmount) {
        throw new Error(`Amount must be at least ${conversionRate.minAmount} ${fromCurrency.toUpperCase()}`);
      }

      if (amount > conversionRate.maxAmount) {
        throw new Error(`Amount cannot exceed ${conversionRate.maxAmount} ${fromCurrency.toUpperCase()}`);
      }

      // Get user wallet
      const wallet = await Wallet.findOne({ userId })

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check if user has sufficient balance
      const availableBalance = wallet.balances[fromCurrency as 'xp' | 'usdt'] - wallet.locked[fromCurrency as 'xp' | 'usdt'];
      if (availableBalance < amount) {
        throw new Error(`Insufficient ${fromCurrency.toUpperCase()} balance. Available: ${availableBalance}`);
      }

      // Calculate conversion
      const feeAmount = (amount * conversionRate.fee) / 100;
      const amountAfterFee = amount - feeAmount;
      const toAmount = amountAfterFee * conversionRate.rate;

      // Step 3: Securing transaction
      socket.emit('converter:processing', {
        step: 'securing',
        progress: 75,
        message: 'Securing transaction',
      });

      await this.delay(5000); // 5 seconds delay

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

      // Step 4: Finalizing
      socket.emit('converter:processing', {
        step: 'finalizing',
        progress: 95,
        message: 'Finalizing...',
      });

      await this.delay(3000); // 3 seconds delay

     
      
      console.log(`✅ Conversion successful for user ${userId}`);

      // Emit success event to the user
      socket.emit('converter:success', {
        success: true,
        message: `Successfully converted ${amount} ${fromCurrency.toUpperCase()} to ${toAmount.toFixed(2)} ${toCurrency.toUpperCase()}`,
        data: {
          conversion: conversion[0],
          newBalances : {
            xp : wallet.balances.xp,
            usdt : wallet.balances.usdt
          }
        },
      });

      // Broadcast balance update to all user's connected sockets
      
       const balanceUpdate = {
          type: 'user:balance:update',
          userId ,
          usdt :  wallet.balances.usdt,
          timestamp: new Date(),
        };
         this.io.to(`user:${userId}`).emit('user:balance:update', balanceUpdate );

       this.io.to(`user:${userId}`).emit('user:xp:update', {
        userId,
        xp : wallet.balances.xp 
      });

    } catch (error: any) {
 
    
      console.error('❌ Error converting currency:', error.message);

      // Emit failure event
      socket.emit('converter:failure', {
        success: false,
        error: error.message || 'Failed to convert currency',
      });
    }
  }

  /**
   * Register converter socket events
   */
  registerEvents(socket: Socket) {
    socket.on('converter:convert', (data) => this.handleConvert(socket, data));
  }
}

export default ConverterSocketController;
