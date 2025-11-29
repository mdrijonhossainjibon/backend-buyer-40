/**
 * Wallet utility functions for generating wallets and deriving addresses
 * Supports multiple blockchain networks
 */

import crypto from 'crypto';

/**
 * Generate a new wallet with private key and address
 * @param network - Network type (ethereum, bsc, tron, etc.)
 * @returns Object containing privateKey and address
 */
export function generateWallet(network: string = 'ethereum'): { privateKey: string; address: string } {
  // Generate random 32 bytes for private key
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKey = '0x' + privateKeyBytes.toString('hex');
  
  // For demo purposes, generate a mock address
  // In production, use proper libraries like ethers.js or web3.js
  const addressBytes = crypto.createHash('sha256').update(privateKeyBytes).digest();
  const address = '0x' + addressBytes.slice(0, 20).toString('hex');
  
  return {
    privateKey,
    address,
  };
}

/**
 * Derive address from private key
 * @param privateKey - Private key in hex format
 * @param network - Network type (ethereum, bsc, tron, etc.)
 * @returns Derived address
 */
export function getAddressFromPrivateKey(privateKey: string, network: string = 'ethereum'): string {
  // Remove '0x' prefix if present
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  // Validate private key format
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error('Invalid private key format');
  }
  
  // For demo purposes, derive address from private key hash
  // In production, use proper libraries like ethers.js or web3.js
  const keyBuffer = Buffer.from(cleanKey, 'hex');
  const addressBytes = crypto.createHash('sha256').update(keyBuffer).digest();
  const address = '0x' + addressBytes.slice(0, 20).toString('hex');
  
  return address;
}

/**
 * Validate if an address is valid for the given network
 * @param address - Address to validate
 * @param network - Network type
 * @returns Boolean indicating if address is valid
 */
export function isValidAddress(address: string, network: string = 'ethereum'): boolean {
  if (network === 'tron' || network.includes('trc20')) {
    // TRON addresses start with 'T' and are 34 characters
    return /^T[A-Za-z0-9]{33}$/.test(address);
  } else {
    // EVM-compatible addresses (Ethereum, BSC, etc.)
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }
}

/**
 * Format address for display (shortened version)
 * @param address - Full address
 * @returns Shortened address (e.g., 0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
