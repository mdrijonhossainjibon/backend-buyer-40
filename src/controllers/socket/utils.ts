// Utility functions for socket operations

/**
 * Generate a unique client ID
 */
export function generateClientId(): string {
  return 'client_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

/**
 * Generate a unique transaction ID
 */
export function generateTransactionId(): string {
  return 'TXN' + Math.random().toString(36).substr(2, 16).toUpperCase();
}

/**
 * Simulate blockchain transaction hash
 */
export function generateBlockchainTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
