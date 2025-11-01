import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Create Redis clients for pub/sub
let redisPublisher: ReturnType<typeof createClient> | null = null;
let redisSubscriber: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis clients for pub/sub
 */
export async function initializeRedis(): Promise<{
  publisher: ReturnType<typeof createClient>;
  subscriber: ReturnType<typeof createClient>;
}> {
  try {
    // Build Redis client options
    const baseOptions: any = {
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      database: redisConfig.db,
    };

    // Only add password if it's provided
    if (redisConfig.password && redisConfig.password.trim() !== '') {
      baseOptions.password = redisConfig.password;
    }

    // Create publisher client with cloned options
    redisPublisher = createClient({ ...baseOptions });

    // Create subscriber client with cloned options
    redisSubscriber = createClient({ ...baseOptions });

    // Connect publisher
    await redisPublisher.connect();
    console.log('✅ Redis Publisher connected');

    // Connect subscriber
    await redisSubscriber.connect();
    console.log('✅ Redis Subscriber connected');

    // Handle errors
    redisPublisher.on('error', (err) => {
      console.error('❌ Redis Publisher Error:', err);
    });

    redisSubscriber.on('error', (err) => {
      console.error('❌ Redis Subscriber Error:', err);
    });

    return {
      publisher: redisPublisher,
      subscriber: redisSubscriber,
    };
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    throw error;
  }
}

/**
 * Get Redis publisher client
 */
export function getRedisPublisher(): ReturnType<typeof createClient> | null {
  return redisPublisher;
}

/**
 * Get Redis subscriber client
 */
export function getRedisSubscriber(): ReturnType<typeof createClient> | null {
  return redisSubscriber;
}

/**
 * Close Redis connections
 */
export async function closeRedis(): Promise<void> {
  try {
    if (redisPublisher) {
      await redisPublisher.quit();
      console.log('✅ Redis Publisher disconnected');
    }
    if (redisSubscriber) {
      await redisSubscriber.quit();
      console.log('✅ Redis Subscriber disconnected');
    }
  } catch (error) {
    console.error('❌ Error closing Redis connections:', error);
  }
}

/**
 * Publish a message to a Redis channel
 */
export async function publishToRedis(channel: string, message: any): Promise<void> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return;
  }

  try {
    const messageStr = JSON.stringify(message);
    await redisPublisher.publish(channel, messageStr);
    console.log(`📤 Published to Redis channel "${channel}"`);
  } catch (error) {
    console.error('❌ Error publishing to Redis:', error);
  }
}

/**
 * Subscribe to a Redis channel
 */
export async function subscribeToRedis(
  channel: string,
  callback: (message: any) => void
): Promise<void> {
  if (!redisSubscriber) {
    console.warn('⚠️ Redis subscriber not initialized');
    return;
  }

  try {
    await redisSubscriber.subscribe(channel, (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch (error) {
        console.error('❌ Error parsing Redis message:', error);
      }
    });
    console.log(`📥 Subscribed to Redis channel "${channel}"`);
  } catch (error) {
    console.error('❌ Error subscribing to Redis:', error);
  }
}

/**
 * Add a subscription to Redis Set
 */
export async function addSubscription(userId: number, clientId: string, type: string = 'balance'): Promise<void> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return;
  }

  try {
    const key = `subscriptions:${type}:user:${userId}`;
    await redisPublisher.sAdd(key, clientId);
    // Set expiration to 24 hours
    await redisPublisher.expire(key, 86400);
  } catch (error) {
    console.error('❌ Error adding subscription to Redis:', error);
  }
}

/**
 * Remove a subscription from Redis Set
 */
export async function removeSubscription(userId: number, clientId: string, type: string = 'balance'): Promise<void> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return;
  }

  try {
    const key = `subscriptions:${type}:user:${userId}`;
    await redisPublisher.sRem(key, clientId);
  } catch (error) {
    console.error('❌ Error removing subscription from Redis:', error);
  }
}

/**
 * Get all subscriptions for a user from Redis
 */
export async function getSubscriptions(userId: number, type: string = 'balance'): Promise<string[]> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return [];
  }

  try {
    const key = `subscriptions:${type}:user:${userId}`;
    return await redisPublisher.sMembers(key);
  } catch (error) {
    console.error('❌ Error getting subscriptions from Redis:', error);
    return [];
  }
}

/**
 * Get subscription count for a user from Redis
 */
export async function getSubscriptionCount(userId: number): Promise<number> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return 0;
  }

  try {
    const key = `subscriptions:user:${userId}`;
    return await redisPublisher.sCard(key);
  } catch (error) {
    console.error('❌ Error getting subscription count from Redis:', error);
    return 0;
  }
}

/**
 * Store client-to-userId mapping in Redis
 */
export async function setClientUserMapping(clientId: string, userId: number): Promise<void> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return;
  }

  try {
    const key = `client:${clientId}:userId`;
    await redisPublisher.set(key, userId.toString(), { EX: 86400 }); // 24 hour expiration
  } catch (error) {
    console.error('❌ Error setting client-user mapping in Redis:', error);
  }
}

/**
 * Get userId for a client from Redis
 */
export async function getClientUserMapping(clientId: string): Promise<number | null> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return null;
  }

  try {
    const key = `client:${clientId}:userId`;
    const userId = await redisPublisher.get(key);
    return userId ? parseInt(userId) : null;
  } catch (error) {
    console.error('❌ Error getting client-user mapping from Redis:', error);
    return null;
  }
}

/**
 * Remove client-to-userId mapping from Redis
 */
export async function removeClientUserMapping(clientId: string): Promise<void> {
  if (!redisPublisher) {
    console.warn('⚠️ Redis publisher not initialized');
    return;
  }

  try {
    const key = `client:${clientId}:userId`;
    await redisPublisher.del(key);
  } catch (error) {
    console.error('❌ Error removing client-user mapping from Redis:', error);
  }
}

export default {
  initializeRedis,
  getRedisPublisher,
  getRedisSubscriber,
  closeRedis,
  publishToRedis,
  subscribeToRedis,
};
