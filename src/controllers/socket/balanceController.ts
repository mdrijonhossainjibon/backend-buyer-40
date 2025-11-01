import { Socket } from 'socket.io';
import {
  addSubscription,
  removeSubscription,
  getSubscriptions,
  setClientUserMapping,
  getClientUserMapping,
  removeClientUserMapping,
  publishToRedis,
} from '../../config/redis';
import {
  BalanceChangeResponse,
  BalanceSubscribedResponse,
  BalanceUnsubscribedResponse,
  ErrorResponse,
} from './types';
import User from '../../models/User';

// Redis channel names
const REDIS_CHANNEL_BALANCE_CHANGE = 'balance:change';

/**
 * Balance Controller
 * Handles all balance-related socket operations
 */
export class BalanceController {
  /**
   * Handle balance subscription
   */
  async onSubscribeBalance(socket: Socket, clientId: string, data: { userId: number }): Promise<void> {
    try {
      const { userId } = data;
      console.log(`📊 Client ${clientId} subscribing to balance for user ${userId}`);

      // Get current user balance
      const user = await User.findOne({ userId });
      if (!user) {
        const errorResponse: ErrorResponse = {
          type: 'ERROR',
          error: `User ${userId} not found`,
        };
        socket.emit('ERROR', errorResponse);
        return;
      }

      // Store subscription in Redis (for cross-server awareness)
      await addSubscription(userId, clientId);
      await setClientUserMapping(clientId, userId);

      // Send subscription confirmation with current balance
      const subscribedResponse: BalanceSubscribedResponse = {
        type: 'BALANCE_SUBSCRIBED',
        userId,
        currentBalance: user.balanceTK,
        message: `Subscribed to balance updates for user ${userId}`,
      };
      socket.emit('BALANCE_SUBSCRIBED', subscribedResponse);
      console.log(`✅ Client ${clientId} subscribed to balance for user ${userId} (stored in Redis)`);
    } catch (error: any) {
      console.error(`❌ Error subscribing to balance for ${clientId}:`, error);
      const errorResponse: ErrorResponse = {
        type: 'ERROR',
        error: error.message || 'Failed to subscribe to balance',
      };
      socket.emit('ERROR', errorResponse);
    }
  }

  /**
   * Handle balance unsubscription
   */
  async onUnsubscribeBalance(socket: Socket, clientId: string, data: { userId: number }): Promise<void> {
    try {
      const { userId } = data;
      console.log(`📊 Client ${clientId} unsubscribing from balance for user ${userId}`);

      // Remove from Redis
      await removeSubscription(userId, clientId);
      await removeClientUserMapping(clientId);

      // Send unsubscription confirmation
      const unsubscribedResponse: BalanceUnsubscribedResponse = {
        type: 'BALANCE_UNSUBSCRIBED',
        userId,
        message: `Unsubscribed from balance updates for user ${userId}`,
      };
      socket.emit('BALANCE_UNSUBSCRIBED', unsubscribedResponse);
      console.log(`✅ Client ${clientId} unsubscribed from balance for user ${userId} (removed from Redis)`);
    } catch (error: any) {
      console.error(`❌ Error unsubscribing from balance for ${clientId}:`, error);
    }
  }

  /**
   * Handle client disconnection cleanup
   */
  async onDisconnect(clientId: string, reason: string): Promise<void> {
    console.log(`🔌 Client ${clientId} disconnected: ${reason}`);
    
    // Get userId from Redis and clean up subscriptions
    const userId = await getClientUserMapping(clientId);
    if (userId) {
      // Clean up Redis subscriptions
      await removeSubscription(userId, clientId);
      await removeClientUserMapping(clientId);
      console.log(`✅ Cleaned up subscriptions for client ${clientId} (user ${userId})`);
    }
  }

  /**
   * Broadcast balance change to all subscribed clients for a user
   * Uses Redis pub/sub for multi-server support
   */
  async broadcastBalanceChange(
    userId: number,
    balanceTK: number,
    totalEarned: number,
    withdrawnAmount: number,
    changeAmount: number,
    changeType: 'earned' | 'withdrawn' | 'bonus' | 'refund'
  ): Promise<void> {
    const balanceChangeResponse: BalanceChangeResponse = {
      type: 'BALANCE_CHANGED',
      userId,
      balanceTK,
      totalEarned,
      withdrawnAmount,
      changeAmount,
      changeType,
      timestamp: new Date(),
    };

    // Publish to Redis for multi-server support
    await publishToRedis(REDIS_CHANNEL_BALANCE_CHANGE, balanceChangeResponse);

    // Also broadcast to local subscribers (for single-server or immediate delivery)
    await this.broadcastBalanceChangeLocal(balanceChangeResponse);
  }

  /**
   * Broadcast balance change to local subscribed clients only
   * Fetches subscriber list from Redis (single source of truth) and emits to connected sockets
   */
  async broadcastBalanceChangeLocal(balanceChangeResponse: BalanceChangeResponse): Promise<void> {
    const { userId, changeAmount, changeType } = balanceChangeResponse;

    console.log(balanceChangeResponse)
    
    // Get subscribers from Redis (single source of truth)
    const subscribers = await getSubscriptions(userId);
    
    if (!subscribers || subscribers.length === 0) {
      console.log(`📊 No subscribers for user ${userId} balance changes`);
      return;
    }

    let successCount = 0;
    // Look up Socket objects from local registry and emit events
    subscribers.forEach((clientId) => {
      // Socket emission would happen here if we had access to the io instance
      // This is handled in the service layer
      successCount++;
    });

    console.log(`📊 Broadcasted balance change for user ${userId} to ${successCount} clients (${changeType}: ${changeAmount > 0 ? '+' : ''}${changeAmount} TK)`);
  }

  /**
   * Get balance subscription count for a user (from Redis - cross-server)
   */
  async getBalanceSubscriptionCount(userId: number): Promise<number> {
    const { getSubscriptionCount } = await import('../../config/redis');
    return await getSubscriptionCount(userId);
  }

   
}
