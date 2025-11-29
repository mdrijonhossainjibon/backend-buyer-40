import mongoose, { Schema, Document } from 'mongoose';

/**
 * Transaction Interface for tracking deposits and withdrawals
 */
export interface ITransaction extends Document {
  txHash: string; // Unique transaction hash
  type: 'deposit' | 'withdrawal'; // Transaction type
  amount: number; // Transaction amount
  tokenAddress: string; // Token contract address
  tokenSymbol: string; // Token symbol (e.g., USDT, ETH)
  fromAddress: string; // Sender address
  toAddress: string; // Recipient address
  walletId?: string; // Reference to AdminWallet if applicable
  blockNumber: number; // Block number where transaction was mined
  networkId: string; // Network identifier (e.g., 'sepolia', 'bsc')
  networkName: string; // Network name (e.g., 'Ethereum Sepolia', 'BSC Mainnet')
  status: 'pending' | 'confirmed' | 'failed'; // Transaction status
  confirmations: number; // Number of confirmations
  gasUsed?: number; // Gas used for the transaction
  gasPrice?: string; // Gas price in wei
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction Schema
 */
const TransactionSchema = new Schema<ITransaction>(
  {
    txHash: {
      type: String,
      required: [true, 'Transaction hash is required'],
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: ['deposit', 'withdrawal'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    tokenAddress: {
      type: String,
      required: [true, 'Token address is required'],
      index: true,
    },
    tokenSymbol: {
      type: String,
      required: [true, 'Token symbol is required'],
      uppercase: true,
      index: true,
    },
    fromAddress: {
      type: String,
      required: [true, 'From address is required'],
      index: true,
    },
    toAddress: {
      type: String,
      required: [true, 'To address is required'],
      index: true,
    },
    walletId: {
      type: String,
      ref: 'AdminWallet',
      index: true,
    },
    blockNumber: {
      type: Number,
      required: [true, 'Block number is required'],
      index: true,
    },
    networkId: {
      type: String,
      required: [true, 'Network ID is required'],
      index: true,
    },
    networkName: {
      type: String,
      required: [true, 'Network name is required'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['pending', 'confirmed', 'failed'],
      default: 'confirmed',
      index: true,
    },
    confirmations: {
      type: Number,
      default: 0,
      min: 0,
    },
    gasUsed: {
      type: Number,
      min: 0,
    },
    gasPrice: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indexes for better query performance
TransactionSchema.index({ txHash: 1, type: 1 });
TransactionSchema.index({ walletId: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ toAddress: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ fromAddress: 1, type: 1, createdAt: -1 });

const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
