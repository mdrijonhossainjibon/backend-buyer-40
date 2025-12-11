import { Server as SocketIOServer } from 'socket.io';
import Wallet from 'models/Wallet';
import Withdrawal from 'models/Withdrawal';
import { sendNativeToken, sendErc20, getERC20Decimals, getERC20Balance, getNativeBalance, formatNativeBalance , formatTokenBalance } from 'auth-fingerprint';
import CryptoCoin from 'models/CryptoCoin';
import AdminWallet from 'models/AdminWallet';
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
    let sendAmount = amount; // Will be updated after fee calculation
    
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

      // Step 2: Get coin and network info
      const coin = await CryptoCoin.findOne({ symbol: coinSymbol.toUpperCase(), isActive: true });
      if (!coin) {
        throw new Error(`Coin ${coinSymbol} not found or inactive`);
      }

      const networkInfo = coin.networks.find(n => n.id === network && n.isActive);
      if (!networkInfo) {
        throw new Error(`Network ${network} not found or inactive for ${coinSymbol}`);
      }

      // Calculate send amount after fee deduction
      const withdrawFee = parseFloat(networkInfo.withdrawFee) || 0;
      sendAmount = amount - withdrawFee;
      
      if (sendAmount <= 0) {
        throw new Error(`Amount after fee (${sendAmount}) must be greater than 0`);
      }

      console.log(`💰 Withdrawal: Amount=${amount}, Fee=${withdrawFee}, SendAmount=${sendAmount}`);

      // Step 3: Get admin wallet with private key
      const adminWallet = await AdminWallet.findOne({ 
        status: 'active',
        supportedNetworks: network 
      }).select('+privateKey');
      
      if (!adminWallet) {
        throw new Error(`No active admin wallet found for network ${network}`);
      }

      this.io?.emit('withdrawal:status:update', {
        withdrawalId,
        userId,
        status: 'processing',
        message: 'Processing withdrawal on blockchain...',
        timestamp: new Date()
      });
      console.log(`⚙️ Processing withdrawal ${withdrawalId} on blockchain`);

      // Step 4: Check admin wallet balance before sending
      let txHash: string;
      
      if (coin.isNativeCoin || networkInfo.type === 'Native') {
        // Check native balance
        const nativeBalance = await getNativeBalance(networkInfo.rpcUrl, adminWallet.address);
        const formattedBalance = parseFloat(formatNativeBalance(nativeBalance));
        
        if (formattedBalance < sendAmount) {
          throw new Error(`Insufficient admin wallet balance. Available: ${formattedBalance} ${coinSymbol}. Required: ${sendAmount}. Please top up the admin wallet.`);
        }

        // Send native token (ETH, BNB, TRX, etc.) - send amount after fee
        const result = await sendNativeToken(
          adminWallet.privateKey,
          walletAddress,
          sendAmount.toString(),
          networkInfo.rpcUrl
        );
        txHash = (result as any).hash || (result as any).transactionHash || String(result);
      } else {
        // Check ERC20 token balance
        if (!networkInfo.contactAddress) {
          throw new Error(`Contract address is required for ${coinSymbol} on ${network}`);
        }

        const decimals = await getERC20Decimals(networkInfo.rpcUrl, networkInfo.contactAddress);
        const tokenBalance = await getERC20Balance(networkInfo.rpcUrl, networkInfo.contactAddress, adminWallet.address);
        const formattedBalance = formatTokenBalance(tokenBalance, decimals || 18);
       
        if (Number(formattedBalance) < sendAmount) {
          throw new Error(`Insufficient admin wallet balance. Available: ${formattedBalance} ${coinSymbol}. Required: ${sendAmount}. Please top up the admin wallet.`);
        }

        // Send ERC20/BEP20/TRC20 token - send amount after fee
        const result = await sendErc20(networkInfo.rpcUrl, adminWallet.privateKey, networkInfo.contactAddress, walletAddress, sendAmount.toString(), decimals || 18);
        
        if (!result.success) {
          throw new Error(result.result || 'Token transfer failed');
        }
        
        txHash = result.result?.hash || result.result?.transactionHash || String(result.result);
        console.log('Transaction result:', result);
      }

      this.io?.emit('withdrawal:status:update', {
        withdrawalId,
        userId,
        status: 'sent',
        message: 'Transaction sent to blockchain',
        txHash,
        timestamp: new Date()
      });
      console.log(`📤 Withdrawal ${withdrawalId} sent - TxHash: ${txHash}`);

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
          txHash
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
        txHash,
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
      this.io?.emit('withdrawal:status:update', {
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
