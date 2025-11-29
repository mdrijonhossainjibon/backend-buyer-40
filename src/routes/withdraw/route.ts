import { Router, Request, Response } from 'express'
import { verifySignature } from 'lib/auth';
import User from 'models/User'
import Withdrawal from 'models/Withdrawal';
import Wallet from 'models/Wallet';
import CryptoCoin from 'models/CryptoCoin';
 
 
import { withdrawalController } from 'services/socket'

const router = Router();

router.post('/withdraw/submit', async (req: Request, res: Response) => {
   
  try {
    const { timestamp, signature, hash } = req.body;

    if(timestamp === undefined || signature === undefined || hash === undefined){
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: timestamp, signature, hash'
      });
    }

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || 'app';

    const { success , data }= verifySignature({ timestamp, signature, hash }, secretKey);
    if (!success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }  
 
    const { telegramId , coinSymbol, network, walletAddress, amount } = JSON.parse(data as string);
 

    // Validate crypto-specific fields
    if (!coinSymbol || !network || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Coin symbol, network, and wallet address are required for crypto withdrawals'
      });
    }

    // Validate cryptocurrency using CryptoCoin model
    const cryptoCoin = await CryptoCoin.findOne({ 
      symbol: coinSymbol.toUpperCase(),
      isActive: true 
    });

    if (!cryptoCoin) {
      return res.status(400).json({
        success: false,
        message: `Unsupported or inactive cryptocurrency: ${coinSymbol}`
      });
    }

    // Validate network for the selected coin (match by id or name)
    const selectedNetwork = cryptoCoin.networks.find(
      (net) => (net.id === network || net.name === network) && net.isActive
    );

    if (!selectedNetwork) {
      const availableNetworks = cryptoCoin.networks
        .filter(net => net.isActive)
        .map(net => `${net.name} (${net.id})`)
        .join(', ');
      return res.status(400).json({
        success: false,
        message: `Unsupported network for ${coinSymbol}. Available: ${availableNetworks}`
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
    const user = await User.findOne({ userId : telegramId });
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
    const wallet = await Wallet.findOne({ userId : telegramId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Get min withdraw and fee from network configuration
    const minWithdraw = parseFloat(selectedNetwork.minimumWithdraw) || 0;
    const withdrawFee = parseFloat(selectedNetwork.withdrawFee) || 0;
    const requiredReferrals = 0;

    // Check minimum withdrawal amount
    if (amount < minWithdraw) {
      return res.status(400).json({
        success: false, 
        message: `Minimum withdrawal is ${minWithdraw} ${coinSymbol} on ${selectedNetwork.name}`
      });
    }

    // Check if user has enough balance for amount + fee
    const totalRequired = amount + withdrawFee;
    const availableBalance = wallet.balances.usdt - wallet.locked.usdt;

    if (availableBalance < totalRequired) {
      return res.status(400).json({
        success: false, 
        message: `Insufficient balance! Need ${totalRequired} ${coinSymbol} (${amount} + ${withdrawFee} fee). Available: ${availableBalance} ${coinSymbol}`
      });
    }

    if (user.referralCount < requiredReferrals) {
      return res.status(400).json({
        success: false, 
        message: `At least ${requiredReferrals} referrals are required to withdraw.`
      });
    }

    // Calculate net amount after fee
    const netAmount = amount - withdrawFee;

    // Lock the withdrawal amount in wallet
    await Wallet.findOneAndUpdate(
      { userId : telegramId},
      {
        $inc: {
          'locked.usdt': amount
        },
        lastTransaction: new Date()
      }
    );

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      userId: telegramId,
      amount,
      netAmount,
      currency: coinSymbol.toUpperCase(),
      network: selectedNetwork.id,
      networkName: selectedNetwork.name,
      address: walletAddress,
      status: 'pending',
      fee: withdrawFee
    });

    // Process withdrawal with network id
    withdrawalController.processWithdrawal(
      withdrawal.withdrawalId,
      telegramId,
      amount,
      coinSymbol,
      selectedNetwork.id, // Pass network id for AdminWallet lookup
      walletAddress
    );

  
    // Get updated wallet balance
    const updatedWallet = await Wallet.findOne({ userId  : telegramId});
    const remainingBalance = updatedWallet ? updatedWallet.balances.usdt : 0;
    const availableAfter = updatedWallet ? (updatedWallet.balances.usdt - updatedWallet.locked.usdt) : 0;

    return res.json({
      success: true,
      message: 'Crypto withdrawal request submitted successfully',
      data: {
        id: withdrawal._id.toString(),
        transactionId: withdrawal.withdrawalId,
        amount: amount.toFixed(2),
        currency: coinSymbol.toUpperCase(),
        network: selectedNetwork.id,
        networkName: selectedNetwork.name,
        address: walletAddress,
        status: 'pending',
        date: withdrawal.requestedAt.toISOString(),
        fee: withdrawFee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        totalBalance: remainingBalance,
        availableBalance: availableAfter,
        lockedBalance: amount
      }
    })

  } catch (error :any) {
    
    return res.status(500).json({
      success: false, 
      message: error.message || 'Internal server error'
    });
  }
});

// Get withdrawal history for a user
router.get('/withdraw/history', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.query;

    if (timestamp === undefined || signature === undefined || hash === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: timestamp, signature, hash'
      });
    }

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

     const { success , data } = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }  
 
    const { telegramId } = JSON.parse(data as string);

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find user to verify they exist
    const user = await User.findOne({ userId : telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fetch withdrawal history for the user, sorted by most recent first
    const withdrawals = await Withdrawal.find({ userId : telegramId})
      .sort({ requestedAt: -1 })
      .limit(100) // Limit to last 100 withdrawals
      .lean();

    // Transform the data to match frontend WithdrawTransaction interface
    const transformedWithdrawals = withdrawals.map((withdrawal: any) => ({
      id: withdrawal._id.toString(),
      amount: withdrawal.amount.toFixed(2),
      currency: withdrawal.currency,
      network: withdrawal.network,
      address: withdrawal.address,
      status: withdrawal.status,
      date: withdrawal.requestedAt.toISOString(),
      transactionId: withdrawal.withdrawalId,
      fee: withdrawal.fee ? withdrawal.fee.toFixed(2) : undefined,
      txHash: withdrawal.txHash || undefined
    }));

    return res.json({
      success: true,
      data: transformedWithdrawals,
      message: 'Withdrawal history fetched successfully'
    });

  } catch (error: any) {
    console.error('Error fetching withdrawal history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

export default router;
