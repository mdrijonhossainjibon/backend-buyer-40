// Socket event response types

/**
 * Response sent when a client successfully connects
 */
export interface ConnectedResponse {
  type: 'CONNECTED';
  clientId: string;
  message: string;
}

/**
 * Generic socket response structure
 */
export interface SocketResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Balance update event payload
 */
export interface BalanceUpdatePayload {
  type: 'user:balance:update';
  userId: string;
  usdt: number;
  timestamp: Date;
}

/**
 * XP update event payload
 */
export interface XPUpdatePayload {
  userId: string;
  xp: number;
}
