import { Server as SocketIOServer } from 'socket.io';
import Wallet from 'models/Wallet';
import Withdrawal from 'models/Withdrawal';
import User from 'models/User';

/**
 * Withdrawal Controller
 * Handles crypto withdrawal processing with Wallet integration and WebSocket updates
 */
export class WithdrawalController {
  private io?: SocketIOServer;

  /**
   * Set the socket.io server instance
   */
  setIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Process withdrawal asynchronously and send WebSocket updates
   */
  async processWithdrawal(
    withdrawalId: string,
    userId: number,
    amount: number,
    coinSymbol: string,
    network: string,
    walletAddress: string
  ): Promise<void> {
    try {
      console.log(`🔄 Processing withdrawal ${withdrawalId} for user ${userId}`);

      this.io?.emit('withdrawal:status:update', {
        withdrawalId,
        userId,
        status: 'validating',
        message: 'Validating withdrawal request...',
        timestamp: new Date()
      });
      console.log(`🔍 Validating withdrawal ${withdrawalId}`);

      // Step 2: Processing (10 seconds delay)
      await new Promise(resolve => setTimeout(resolve, 10000));
      this.io?.emit('withdrawal:status:update', {
        withdrawalId,
        userId,
        status: 'processing',
        message: 'Processing withdrawal on blockchain...',
        timestamp: new Date()
      });
      console.log(`⚙️ Processing withdrawal ${withdrawalId} on blockchain`);

      // Step 3: Sending transaction (10 seconds delay)
      await new Promise(resolve => setTimeout(resolve, 10000));
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      this.io?.emit('withdrawal:status:update', {
        withdrawalId,
        userId,
        status: 'sent',
        message: 'Transaction sent to blockchain',
        txHash: mockTxHash,
        timestamp: new Date()
      });
      console.log(`📤 Withdrawal ${withdrawalId} sent - TxHash: ${mockTxHash}`);

      // Step 4: Success - Deduct from wallet and unlock (5 seconds delay)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Update wallet: deduct from balance and unlock
      await Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: {
            'balances.usdt': -amount,
            'locked.usdt': -amount,
            'totalSpent.usdt': amount
          },
          lastTransaction: new Date()
        }
      );

      // Update withdrawal status
      await Withdrawal.findOneAndUpdate(
        { withdrawalId },
        {
          status: 'completed',
          processedAt: new Date(),
          txHash: mockTxHash
        }
      );

      // Update user withdrawn amount
      await User.findOneAndUpdate(
        { userId },
        {
          $inc: {
            withdrawnAmount: amount
          }
        }
      );

      // Send success event
      this.io?.emit('withdrawal:status:update', {
        withdrawalId,
        userId,
        status: 'completed',
        message: 'Withdrawal completed successfully!',
        txHash: mockTxHash,
        coinSymbol,
        network,
        walletAddress,
        amount,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error(`❌ Withdrawal ${withdrawalId} failed:`, error);

      // Unlock the funds on failure
      await Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: {
            'locked.usdt': -amount
          },
          lastTransaction: new Date()
        }
      );

      // Update withdrawal status to failed
      await Withdrawal.findOneAndUpdate(
        { withdrawalId },
        {
          status: 'failed'
        }
      );

      // Send failure event
      this.io?.emit('WITHDRAWAL_STATUS_UPDATE', {
        withdrawalId,
        userId,
        status: 'failed',
        message: `Withdrawal failed: ${error.message}`,
        error: error.message,
        timestamp: new Date()
      });
    }
  }
}
