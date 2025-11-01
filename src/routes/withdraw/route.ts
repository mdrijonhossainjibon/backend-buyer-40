import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import User from 'models/User'
import Withdrawal from 'models/Withdrawal';
import Wallet from 'models/Wallet';
import { telegramBotService } from '../../services/telegram'
 
import { withdrawalController } from 'services/socket'

const router = Router();

router.post('/withdraw', async (req: Request, res: Response) => {
   
  try {
    const { timestamp, signature, hash , data } = req.body;

    if(timestamp === undefined || signature === undefined || hash === undefined){
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: timestamp, signature, hash'
      });
    }

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

   /*  const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    } */
 
    const { userId, coinSymbol, network, walletAddress, amount } = JSON.parse(data as string);

    // Validate crypto-specific fields
    if (!coinSymbol || !network || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Coin symbol, network, and wallet address are required for crypto withdrawals'
      });
    }

    // Supported cryptocurrencies
    const supportedCoins = ['USDT', 'BTC', 'ETH', 'BNB', 'TRX'];
    if (!supportedCoins.includes(coinSymbol.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Unsupported cryptocurrency. Supported: ${supportedCoins.join(', ')}`
      });
    }

    // Supported networks
    const supportedNetworks = ['TRC20', 'ERC20', 'BEP20', 'Bitcoin', 'Ethereum', 'BSC', 'Tron'];
    if (!supportedNetworks.includes(network)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported network. Supported: ${supportedNetworks.join(', ')}`
      });
    }

    // Basic wallet address validation
    if (walletAddress.length < 26 || walletAddress.length > 62) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }

    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false, 
        message: 'User not found'
      });
    }

    // Check if user is suspended
    if (user.status === 'suspend') {
      return res.status(403).json({
        success: false, 
        message: 'Your account has been suspended! Unable to withdraw।'
      });
    }

    // Get user wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Validation checks
    const minWithdraw = 2
    const requiredReferrals = 0

    if (wallet.balances.usdt < minWithdraw) {
      return res.status(400).json({
        success: false, 
        message: `Minimum withdrawal amount ${minWithdraw} USDT`
      });
    }

    if (user.referralCount < requiredReferrals) {
      return res.status(400).json({
        success: false, 
        message: `At least ${requiredReferrals} referrals are required to withdraw.`
      });
    }

    // Check available balance (balance - locked)
    const availableBalance = wallet.balances.usdt - wallet.locked.usdt;
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false, 
        message: `Insufficient balance! Available: ${availableBalance} USDT`
      });
    }

    if (amount < minWithdraw) {
      return res.status(400).json({
        success: false, 
        message: `Minimum ${minWithdraw} USDT required`
      });
    }

    // Calculate fees (you can adjust this logic as needed)
    const feePercentage = 0 // 0% fee for now
    const fees = Math.round(amount * feePercentage / 100)
    const netAmount = amount - fees

    // Lock the withdrawal amount in wallet
    await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: {
          'locked.usdt': amount
        },
        lastTransaction: new Date()
      }
    );

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      userId,
      amount,
      method: 'Crypto' as any,
      accountDetails: {
        accountNumber: walletAddress,
        accountName: `${coinSymbol} (${network})`
      },
      fees,
      netAmount,
      status: 'pending',
      metadata: {
        coinSymbol: coinSymbol.toUpperCase(),
        network,
        walletAddress,
        withdrawalType: 'cryptocurrency',
        ipAddress: req.get('x-forwarded-for') || req.get('x-real-ip'),
        userAgent: req.get('user-agent')
      }
    })
 
     
    withdrawalController.processWithdrawal(
      withdrawal.withdrawalId,
      userId,
      amount,
      coinSymbol,
      network,
      walletAddress
    );

 

    // Send Telegram notification to user
    try {
      const maskedAddress = `${walletAddress.substring(0, 10)}...${walletAddress.substring(walletAddress.length - 6)}`;
      const telegramMessage = `💰 *Crypto Withdrawal Request Submitted*\n\n` +
        `✅ Your withdrawal request has been successfully submitted!\n\n` +
        `📋 *Details:*\n` +
        `• Amount: *${amount} USDT*\n` +
        `• Cryptocurrency: *${coinSymbol}*\n` +
        `• Network: *${network}*\n` +
        `• Wallet: \`${maskedAddress}\`\n` +
        `• Withdrawal ID: \`${withdrawal.withdrawalId}\`\n` +
        `• Fees: *${fees} USDT*\n` +
        `• Net Amount: *${netAmount} USDT*\n` +
        `• Status: *Pending*\n\n` +
        `⏳ Your withdrawal will be processed soon.\n` +
        `💵 Remaining Balance: *${(user.balanceTK - amount).toFixed(2)} USDT*`;

      await telegramBotService.sendMessageToUser(
        parseInt(userId),
        telegramMessage,
        { parse_mode: 'Markdown' }
      );
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
      // Don't fail the withdrawal if Telegram notification fails
    }

    // Get updated wallet balance
    const updatedWallet = await Wallet.findOne({ userId });
    const remainingBalance = updatedWallet ? updatedWallet.balances.usdt : 0;
    const availableAfter = updatedWallet ? (updatedWallet.balances.usdt - updatedWallet.locked.usdt) : 0;

    return res.json({
      success: true,
      message: 'Crypto withdrawal request submitted successfully. Real-time updates will be sent via WebSocket.',
      data: {
        withdrawalId: withdrawal.withdrawalId,
        totalBalance: remainingBalance,
        availableBalance: availableAfter,
        lockedBalance: amount,
        withdrawAmount: amount,
        fees,
        netAmount,
        coinSymbol: coinSymbol.toUpperCase(),
        network,
        walletAddress,
        status: 'pending'
      }
    })

  } catch (error :any) {
    
    return res.status(500).json({
      success: false, 
      message: error.message || 'Internal server error'
    });
  }
});

export default router;
