import { Server as SocketIOServer, Socket } from 'socket.io';

import { generateBlockchainTxHash } from './utils';
import Wallet, { IWallet } from '../../models/Wallet';
import Swap, { ISwap } from '../../models/Swap';
import User from '../../models/User';

/**
 * Swap Controller
 * Handles real-time swap status updates via WebSocket
 * No subscription needed - events are sent to all connected clients for the user
 */
export class SwapController {
  private io?: SocketIOServer;

  /**
   * Set the socket.io server instance
   */
  setIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Broadcast SWAP_INITIATED event when swap is first created
   */
  async broadcastSwapInitiated(
    userId: number,
    swapId: string,
    fromToken: string,
    toToken: string,
    fromAmount: number,
    toAmount: number
  ): Promise<void> {
    const eventPayload = {
      type: 'SWAP_INITIATED',
      swapId,
      userId,
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      status: 'pending',
      message: 'Swap request received and is being processed',
      timestamp: new Date(),
    };

    console.log(`🚀 Broadcasting SWAP_INITIATED for swap ${swapId} to user ${userId}`);
    console.log(`📊 Connected sockets: ${this.io?.sockets.sockets.size || 0}`);

    if (this.io) {
      // Emit to all sockets and to user-specific room
      this.io.emit('SWAP_INITIATED', eventPayload);
      this.io.to(`user:${userId}`).emit('SWAP_INITIATED', eventPayload);
      console.log(`✅ SWAP_INITIATED event emitted successfully`);
    } else {
      console.error('❌ Socket.IO instance not initialized');
    }
  }

  /**
   * Broadcast swap status update to subscribed clients
   * This is called when swap status changes (from API or background job)
   */
  async broadcastSwapStatus(
    userId: number,
    swapId: string,
    status: 'validating' | 'sending_tx' | 'success' | 'failed',
    data: {
      fromToken: string;
      toToken: string;
      fromAmount: number;
      toAmount: number;
      txHash?: string;
      error?: string;
    }
  ): Promise<void> {
    const eventData = {
      userId,
      swapId,
      status,
      ...data,
      timestamp: new Date(),
    };

    // Broadcast to local subscribers using Socket.IO
    await this.broadcastSwapStatusLocal(eventData);
  }

  /**
   * Broadcast swap status to local connected clients
   * Events are sent to all connected clients for the user (no subscription needed)
   */
  private async broadcastSwapStatusLocal(eventData: any): Promise<void> {
    const { userId, swapId, status, fromToken, toToken, fromAmount, toAmount, txHash, error } = eventData;

    // Determine which event to emit based on status
    let eventType: string;
    let eventPayload: any;

    switch (status) {
      case 'validating':
        eventType = 'SWAP_VALIDATING';
        eventPayload = {
          type: 'SWAP_VALIDATING',
          swapId,
          userId,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          message: 'Validating swap parameters...',
          timestamp: new Date(),
        };
        break;

      case 'sending_tx':
        eventType = 'SWAP_SENDING_TX';
        eventPayload = {
          type: 'SWAP_SENDING_TX',
          swapId,
          userId,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          message: 'Sending transaction to blockchain...',
          timestamp: new Date(),
        };
        break;

      case 'success':
        eventType = 'SWAP_SUCCESS';
        eventPayload = {
          type: 'SWAP_SUCCESS',
          swapId,
          userId,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          txHash,
          message: 'Swap completed successfully',
          timestamp: new Date(),
        };
        break;

      case 'failed':
        eventType = 'SWAP_FAILED';
        eventPayload = {
          type: 'SWAP_FAILED',
          swapId,
          userId,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          error: error || 'Swap failed',
          timestamp: new Date(),
        };
        break;

      default:
        return;
    }

    console.log(`🔄 Broadcasting ${eventType} for swap ${swapId} to user ${userId}`);
    console.log(`📊 Connected sockets: ${this.io?.sockets.sockets.size || 0}`);

    // Emit to all connected clients and to user-specific room
    if (this.io) {
      this.io.emit(eventType, eventPayload);
      this.io.to(`user:${userId}`).emit(eventType, eventPayload);
      console.log(`✅ Event ${eventType} emitted successfully`);
    } else {
      console.error('❌ Socket.IO instance not initialized');
    }
  }

  /**
   * Process swap with real wallet operations
   */
  async processSwap(
    userId: number,
    swapId: string,
    fromToken: string,
    toToken: string,
    fromAmount: number,
    toAmount: number
  ): Promise<void> {
    let swap: ISwap | null = null;
    const fromTokenLower = fromToken.toLowerCase() as 'xp' | 'usdt' | 'spin';
    const toTokenLower = toToken.toLowerCase() as 'xp' | 'usdt' | 'spin';

    try {
      // Step 1: Validating - Check user exists and has sufficient balance
      await this.broadcastSwapStatus(userId, swapId, 'validating', {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
      });

      // Check if user exists
      const user = await User.findOne({ userId });
      if (!user) {
        throw new Error('User not found');
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

      // Check sufficient balance
      const availableBalance = wallet.balances[fromTokenLower] - wallet.locked[fromTokenLower];
      if (availableBalance < fromAmount) {
        throw new Error(`Insufficient ${fromToken} balance. Available: ${availableBalance}, Required: ${fromAmount}`);
      }

      // Calculate exchange rate
      const exchangeRate = toAmount / fromAmount;

      // Create swap record
      swap = await Swap.create({
        swapId,
        userId,
        fromToken: fromTokenLower,
        toToken: toTokenLower,
        fromAmount,
        toAmount,
        exchangeRate,
        status: 'validating',
        requestedAt: new Date(),
        validatedAt: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Processing - Lock funds and execute swap
      await this.broadcastSwapStatus(userId, swapId, 'sending_tx', {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
      });

      // Lock the fromToken amount
      wallet.locked[fromTokenLower] += fromAmount;
      await wallet.save();

      // Update swap status
      if (swap) {
        swap.status = 'processing';
        swap.processedAt = new Date();
        await swap.save();
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Execute the swap
      // Deduct fromToken and add toToken
      wallet.balances[fromTokenLower] -= fromAmount;
      wallet.locked[fromTokenLower] -= fromAmount;
      wallet.balances[toTokenLower] += toAmount;
      wallet.totalSpent[fromTokenLower] += fromAmount;
      wallet.totalEarned[toTokenLower] += toAmount;
      wallet.lastTransaction = new Date();
      await wallet.save();

      // Generate transaction hash (simulated)
      const txHash = generateBlockchainTxHash();

      // Update swap record
      if (swap) {
        swap.status = 'completed';
        swap.txHash = txHash;
        swap.completedAt = new Date();
        await swap.save();
      }

      // Broadcast success
      await this.broadcastSwapStatus(userId, swapId, 'success', {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        txHash,
      });

      console.log(`✅ Swap ${swapId} completed successfully`);
      console.log(`   User ${userId}: ${fromAmount} ${fromToken} → ${toAmount} ${toToken}`);
      console.log(`   TxHash: ${txHash}`);
      console.log(`   New balances - XP: ${wallet.balances.xp}, USDT: ${wallet.balances.usdt}, SPIN: ${wallet.balances.spin}`);

    } catch (error: any) {
      console.error(`❌ Error processing swap ${swapId}:`, error);

      // Unlock funds if they were locked
      if (swap && swap.status === 'processing') {
        try {
          const wallet = await Wallet.findOne({ userId });
          if (wallet) {
            wallet.locked[fromTokenLower] = Math.max(0, wallet.locked[fromTokenLower] - fromAmount);
            await wallet.save();
          }
        } catch (unlockError) {
          console.error('Error unlocking funds:', unlockError);
        }
      }

      // Update swap record as failed
      if (swap) {
        swap.status = 'failed';
        swap.errorMessage = error.message || 'Unknown error';
        await swap.save();
      }

      // Broadcast failure
      await this.broadcastSwapStatus(userId, swapId, 'failed', {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        error: error.message || 'Unknown error',
      });
    }
  }

  
}
